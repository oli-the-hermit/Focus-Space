import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaskList } from '../../types';
import { strings } from '../../constants/strings';
import { IconGrip, IconPlus, IconTrash } from '../ui/icons';

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
      title: `${strings.common.delete} ${strings.tasks.sidebarTitle}`,
      message: `${strings.modals.confirmDeleteDefaultMsg.replace('item', `"${list.name}"`)}`,
      confirmLabel: `${strings.common.delete} ${strings.tasks.sidebarTitle}`,
      onConfirm: () => deleteList(list.id)
    });
  };

  return (
    <div className="card tasks-sidebar">
      <div className="panel-card-header">
        <span className="panel-card-title">{strings.tasks.sidebarTitle}</span>
        <button className="btn-action tonal sm" id="addListBtn" onClick={handleCreateList}>
          <IconPlus size={15} strokeWidth={2.4} />
          {strings.tasks.newListBtn.replace('+ ', '')}
        </button>
      </div>

      <div className="list-nav" id="listNav">
        {state.taskLists.length === 0 ? (
          <div className="empty-state small">{strings.tasks.emptyLists}</div>
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
                <IconGrip title={strings.tasks.dragToReorder} />
                <span className="list-nav-item-name">{list.name}</span>
                <span className="list-nav-count">{done}/{total}</span>
                <button
                  className="icon-btn xs list-nav-item-del danger"
                  onClick={e => handleDeleteList(e, list)}
                  title={strings.tasks.deleteTooltip}
                >
                  <IconTrash size={12} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
