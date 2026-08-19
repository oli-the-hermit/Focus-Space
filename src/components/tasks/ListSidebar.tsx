import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaskList } from '../../types';

export const ListSidebar: React.FC = () => {
  const { state, setActiveList, openModal, deleteList, reorderTaskLists } = useApp();

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== targetId) {
      reorderTaskLists(draggedId, targetId);
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleCreateList = () => {
    openModal('NEW_LIST');
  };

  const handleDeleteList = (e: React.MouseEvent, list: TaskList) => {
    e.stopPropagation();
    openModal('CONFIRM_DELETE', {
      title: 'Delete Task List',
      message: `Are you sure you want to delete "${list.name}"?`,
      confirmLabel: 'Delete List',
      onConfirm: () => deleteList(list.id)
    });
  };

  return (
    <div className="card tasks-sidebar">
      <div className="panel-card-header">
        <span className="panel-card-title">Lists</span>
        <button className="btn-action" id="addListBtn" onClick={handleCreateList}>
          + New List
        </button>
      </div>

      <div className="list-nav" id="listNav">
        {state.taskLists.length === 0 ? (
          <div className="empty-state small">No lists yet.</div>
        ) : (
          state.taskLists.map(list => {
            const isActive = list.id === state.activeListId;
            const done = list.tasks.filter(t => t.completed).length;
            const total = list.tasks.length;
            const isDragging = draggedId === list.id;
            const isDragOver = dragOverId === list.id && draggedId !== list.id;

            return (
              <div
                key={list.id}
                className={`list-nav-item draggable-item ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
                draggable={true}
                data-id={list.id}
                onDragStart={e => handleDragStart(e, list.id)}
                onDragOver={e => handleDragOver(e, list.id)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, list.id)}
                onClick={() => setActiveList(list.id)}
              >
                <span className="drag-handle" title="Drag to reorder">⋮⋮</span>
                <span className="list-nav-item-name">{list.name}</span>
                <span className="list-nav-count">{done}/{total}</span>
                <button
                  className="icon-btn xs list-nav-item-del danger"
                  onClick={e => handleDeleteList(e, list)}
                  title="Delete list"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
