import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

const MODAL_POSITION_KEY = 'slot-counter-modal-position';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  alignTop?: boolean;
  draggable?: boolean;
}

function loadSavedPosition(): { x: number; y: number } | null {
  try {
    const saved = localStorage.getItem(MODAL_POSITION_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return null;
}

function savePosition(x: number, y: number) {
  try {
    localStorage.setItem(MODAL_POSITION_KEY, JSON.stringify({ x, y }));
  } catch { /* ignore */ }
}

export function Modal({ isOpen, onClose, title, children, alignTop, draggable }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [initialized, setInitialized] = useState(false);

  // 開くたびに保存位置を復元
  useEffect(() => {
    if (isOpen && draggable) {
      const saved = loadSavedPosition();
      setPosition(saved);
      setInitialized(true);
    }
    if (!isOpen) {
      setInitialized(false);
    }
  }, [isOpen, draggable]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if (!draggable || !modalRef.current) return;
    e.preventDefault();

    const modal = modalRef.current;
    const rect = modal.getBoundingClientRect();

    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
    };

    const handleMove = (ev: PointerEvent) => {
      if (!dragState.current) return;
      const dx = ev.clientX - dragState.current.startX;
      const dy = ev.clientY - dragState.current.startY;

      const newX = dragState.current.origX + dx;
      const newY = Math.max(0, dragState.current.origY + dy);

      setPosition({ x: newX, y: newY });
    };

    const handleUp = () => {
      if (dragState.current && modalRef.current) {
        const rect = modalRef.current.getBoundingClientRect();
        savePosition(rect.left, rect.top);
      }
      dragState.current = null;
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
  }, [draggable]);

  if (!isOpen) return null;

  const isDraggable = draggable && initialized;
  const modalStyle = isDraggable && position
    ? { left: position.x, top: position.y }
    : undefined;

  return createPortal(
    <div
      className={`${styles.overlay} ${alignTop && !position ? styles.overlayTop : ''}`}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`${styles.modal} ${isDraggable ? styles.draggableModal : ''}`}
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`${styles.header} ${isDraggable ? styles.dragHandle : ''}`}
          onPointerDown={isDraggable ? handleDragStart : undefined}
        >
          <h2 className={styles.title}>{title}</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
