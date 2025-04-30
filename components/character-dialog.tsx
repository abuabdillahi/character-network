"use client"

import { Node } from '@/components/network-graph';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getCharacterConnections } from "@/app/utils";

interface CharacterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedNode: Node | null;
  characterData: Record<string, Record<string, { interactions: number }>> | null;
}

export function CharacterDialog({
  open,
  onOpenChange,
  selectedNode,
  characterData
}: CharacterDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{selectedNode?.name}</DialogTitle>
          <DialogDescription>
            Character details and interactions
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {selectedNode && (
            <>
              <div className="mb-4">
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Total Interactions
                </div>
                <div className="text-2xl font-bold">{selectedNode.value}</div>
              </div>

              <div className="mb-2">
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Connections
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {getCharacterConnections(selectedNode.name || selectedNode.id, characterData).map((connection, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-2 bg-slate-100 dark:bg-slate-800 rounded"
                    >
                      <span className="font-medium">{connection.character}</span>
                      <span className="text-sm bg-sky-600 text-white px-2 py-1 rounded-full">
                        {connection.interactions}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
