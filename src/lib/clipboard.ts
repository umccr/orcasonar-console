import { toast } from 'sonner';

/** Copies text, and says so; `what` names it in the note. */
export const copyText = async (text: string, what = text): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied', { description: what });
  } catch {
    toast.error("Couldn't copy", { description: 'The browser did not allow it.' });
  }
};
