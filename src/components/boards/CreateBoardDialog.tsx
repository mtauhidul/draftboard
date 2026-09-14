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
  onSubmit: (values: {
    title: string;
    description: string;
    category: string;
  }) => Promise<void>;
};

export function CreateBoardDialog({ open, onOpenChange, onSubmit }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Mounted only while the dialog is open, so the form starts empty
            every time without any reset effect. */}
        <CreateBoardForm
          onSubmit={onSubmit}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CreateBoardForm({
  onSubmit,
  onDone,
}: Pick<Props, 'onSubmit'> & { onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError(null);
    try {
      await onSubmit({ title, description, category });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create board.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>New board</DialogTitle>
        <DialogDescription>
          Give it a name. You can change everything later.
        </DialogDescription>
      </DialogHeader>

      {/**
       * The fields are a sibling of the header rather than part of it, so the
       * header's rule stays a rule under the heading — as it is in Excalidraw's
       * own modals — instead of a line drawn through the middle of the form.
       */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="board-title">Title</Label>
          <Input
            id="board-title"
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Career Planning"
            autoFocus
            required
          />
        </div>

        {/*
         * Description and category are both optional, so they carry an
         * explicit hint rather than leaving the user to guess.
         */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="board-description">
            Description
            <span className="font-normal text-muted-foreground">Optional</span>
          </Label>
          <Input
            id="board-description"
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="What is this board for?"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="board-category">
            Category
            <span className="font-normal text-muted-foreground">Optional</span>
          </Label>
          <Input
            id="board-category"
            value={category}
            onChange={event => setCategory(event.target.value)}
            placeholder="e.g. Personal"
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={saving || !title.trim()}>
          {saving ? 'Creating…' : 'Create board'}
        </Button>
      </DialogFooter>
    </form>
  );
}
