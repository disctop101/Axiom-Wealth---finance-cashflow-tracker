import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-neutral-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-2">
            {isDestructive ? (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-blue-600" />
            )}
            <h3 className="font-semibold text-neutral-900 text-sm">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-neutral-400 hover:text-neutral-600 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 text-sm text-neutral-700 leading-relaxed">
          {message}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 bg-neutral-50 border-t border-neutral-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-3 py-1.5 text-xs font-medium text-white rounded transition ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-neutral-800 hover:bg-neutral-900'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
