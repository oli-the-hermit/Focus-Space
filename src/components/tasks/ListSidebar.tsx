import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaskList } from '../../types';
import { strings } from '../../constants/strings';
import { IconCopy, IconEdit, IconGrip, IconList, IconPlus, IconTrash } from '../ui/icons';
import { useContextMenu } from '../ui/ContextMenu';
import { useFlip, useNewIds } from '../../hooks/useListMotion';
import { isDragLeavingElement } from '../../lib/dnd';

export const ListSidebar: React.FC = () => {
  const { state, setActiveList, openModal, deleteList, duplicateList, reorderTaskLists } = useApp();
  const contextMenu = useContextMenu();
  const navRef = useRef<HTMLDivElement>(null);
  const ids = state.taskLists.map(l => l.id);
  const newIds = useNewIds(ids);
  useFlip(navRef, ids);

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

  const handleDragLeave = (e: React.DragEvent) => {
    if (isDragLeavingElement(e)) setDragOverId(null);
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

  const openListMenu = (e: React.MouseEvent, list: TaskList) => {
    contextMenu(e, [
      { key: 'open', label: strings.contextMenu.open, icon: <IconList size={15} />, onSelect: () => setActiveList(list.id) },
      { key: 'new-task', label: strings.contextMenu.newTask, icon: <IconPlus size={15} />, onSelect: () => openModal('NEW_TASK', { listId: list.id }) },
      { key: 'rename', label: strings.tasks.renameTooltip, icon: <IconEdit size={15} />, onSelect: () => openModal('RENAME_LIST', { list }) },
      { key: 'dup', label: strings.tasks.duplicateTooltip, icon: <IconCopy size={15} />, onSelect: () => duplicateList(list.id) },
      { key: 'd1', divider: true },
      { key: 'delete', label: strings.tasks.deleteTooltip, icon: <IconTrash size={15} />, danger: true, onSelect: () => confirmDeleteList(list) }
    ]);
  };

  const handleDeleteList = (e: React.MouseEvent, list: TaskList) => {
    e.stopPropagation();
    confirmDeleteList(list);
  };

  const confirmDeleteList = (list: TaskList) => {
    openModal('CONFIRM_DELETE', {
      title: strings.tasks.deleteListTitle,
      message: `${strings.modals.confirmDeleteDefaultMsg.replace('item', `"${list.name}"`)}`,
      confirmLabel: strings.common.delete,
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

      <div className="list-nav" id="listNav" ref={navRef}>
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
                className={`list-nav-item draggable-item ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''} ${newIds.has(list.id) ? 'item-enter' : ''}`}
                onContextMenu={e => openListMenu(e, list)}
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
