import type { PromptType, SessionQueueItem } from '@/types/session';

export type PromptSourceKind = 'new' | 'review';

export type SessionPromptViewModel = {
  promptType: PromptType;
  promptLabel: string;
  title: string;
  subtitle: string | null;
  contextLabel: string | null;
  contextText: string | null;
  revealHint: string;
  answerLabel: string;
  answerWord: string;
  answerMeaning: string;
  explanationLabel: string;
  explanationText: string;
  leadSentence: string | null;
  secondarySentences: string[];
};

export function pickMeaningfulPromptType(params: {
  source: PromptSourceKind;
  sourceIndex: number;
  hasSentence: boolean;
}): PromptType {
  if (params.source === 'new') {
    if (params.hasSentence && params.sourceIndex > 0 && params.sourceIndex % 3 === 2) {
      return 'fill_blank';
    }

    return 'mcq_meaning';
  }

  if (params.hasSentence && params.sourceIndex > 0 && params.sourceIndex % 4 === 3) {
    return 'fill_blank';
  }

  return 'recall';
}

export function buildSessionPromptViewModel(activeItem: SessionQueueItem): SessionPromptViewModel {
  switch (activeItem.promptType) {
    case 'mcq_meaning':
      return buildMeaningCue(activeItem);
    case 'fill_blank':
      return buildFillBlankCue(activeItem);
    case 'recall':
    default:
      return buildRecallCue(activeItem);
  }
}

function buildRecallCue(item: SessionQueueItem): SessionPromptViewModel {
  const orderedSentences = getOrderedSentences(item);
  const leadSentence = orderedSentences[0] ?? null;

  return {
    promptType: 'recall',
    promptLabel: 'Hatırla',
    title: item.turkish,
    subtitle: 'İngilizcesini zihninden getir, sonra kartı çevir.',
    contextLabel: leadSentence ? 'Bağlam ipucu' : null,
    contextText: leadSentence,
    revealHint: 'Cevabı görmek için karta dokun.',
    answerLabel: 'Doğru cevap',
    answerWord: item.english,
    answerMeaning: item.turkish,
    explanationLabel: leadSentence ? 'Kullanım' : 'Anlam',
    explanationText: leadSentence ?? item.turkish,
    leadSentence,
    secondarySentences: orderedSentences.slice(1, 3),
  };
}

function buildMeaningCue(item: SessionQueueItem): SessionPromptViewModel {
  const orderedSentences = getOrderedSentences(item);
  const leadSentence = orderedSentences[0] ?? null;

  return {
    promptType: 'mcq_meaning',
    promptLabel: 'Anlam',
    title: item.english,
    subtitle: 'Türkçe karşılığını zihninden söyle, sonra kartı çevir.',
    contextLabel: leadSentence ? 'Bağlam ipucu' : null,
    contextText: leadSentence,
    revealHint: 'Hatırladıysan karta dokun ve cevabı doğrula.',
    answerLabel: 'Anlam',
    answerWord: item.english,
    answerMeaning: item.turkish,
    explanationLabel: 'Doğru anlam',
    explanationText: item.turkish,
    leadSentence,
    secondarySentences: orderedSentences.slice(1, 3),
  };
}

function buildFillBlankCue(item: SessionQueueItem): SessionPromptViewModel {
  const orderedSentences = getOrderedSentences(item);
  const leadSentence = orderedSentences[0] ?? null;
  const maskedSentence = leadSentence ? maskSentence(leadSentence, item.english) : null;

  return {
    promptType: 'fill_blank',
    promptLabel: 'Bağlam',
    title: maskedSentence ?? item.turkish,
    subtitle: maskedSentence
      ? 'Boşluğa hangi kelimenin geleceğini zihninden tamamla.'
      : 'Cevabı hatırladıysan karta dokun.',
    contextLabel: maskedSentence ? 'Cümle alıştırması' : null,
    contextText: maskedSentence ? 'Önce bağlamı çöz, sonra kartı çevir.' : null,
    revealHint: 'Cümleyi tamamladıktan sonra karta dokun.',
    answerLabel: 'Doğru kelime',
    answerWord: item.english,
    answerMeaning: item.turkish,
    explanationLabel: 'Tam cümle',
    explanationText: leadSentence ?? item.turkish,
    leadSentence,
    secondarySentences: orderedSentences.slice(1, 3),
  };
}

export function getOrderedSentences(item: SessionQueueItem) {
  if (item.sentences.length > 0) {
    return item.sentences;
  }

  return item.sentence ? [item.sentence] : [];
}

export function maskSentence(sentence: string, word: string) {
  const escaped = escapeForRegExp(word.trim());

  if (!escaped) {
    return sentence;
  }

  const pattern = new RegExp(escaped, 'i');

  if (pattern.test(sentence)) {
    return sentence.replace(pattern, '_____');
  }

  return sentence;
}

export function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
