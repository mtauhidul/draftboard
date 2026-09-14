'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTitle: string;
  onSubmit: (title: string) => Promise<void>;
};

export function RenameBoardDialog({
  open,
  onOpenChange,
  currentTitle,
  onSubmit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Mounted only while open, so the input is seeded from the current
            title on every open without a sync effect. */}
        <RenameBoardForm
          currentTitle={currentTitle}
          onSubmit={onSubmit}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function RenameBoardForm({
  currentTitle,
  onSubmit,
  onDone,
}: Pick<Props, 'currentTitle' | 'onSubmit'> & { onDone: () => void }) {
  const [title, setTitle] = useState(currentTitle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError(null);
    try {
      await onSubmit(title);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename board.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/**
       * Same shape as the create dialog: heading and rule in the header, fields
       * in their own block below it, footer rule last. The two dialogs then
       * share one vertical rhythm and one place for every divider.
       *
       * The input is named through a real `Label` rather than `aria-label`, so
       * it looks like the fields on the other form and gets the click-to-focus
       * behaviour a wrapping label gives for free. The description is not
       * decoration here: `DialogDescription` is what supplies the popup's
       * `aria-describedby`, so without it the dialog announced its title and
       * then nothing.
       */}
      <DialogHeader>
        <DialogTitle>Rename board</DialogTitle>
        <DialogDescription>
          The name is only ever shown in this browser.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="board-title">Title</Label>
        <Input
          id="board-title"
          value={title}
          onChange={event => setTitle(event.target.value)}
          autoFocus
          required
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={saving || !title.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  );
}
