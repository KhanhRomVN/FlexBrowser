import React, { useState } from 'react'
import type { Tab } from '../../../../store/useAccountStore'
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '../../../../components/ui/dropdown-menu'

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string
  onTabChange: (tabId: string) => void
  onDeleteTab: (tabId: string) => void
  onNewTab: () => void
  onReorder: (newTabs: Tab[]) => void
}

const SortableTabItem: React.FC<{
  tab: Tab
  activeTabId: string
  onTabChange: (id: string) => void
  onDeleteTab: (id: string) => void
}> = ({ tab, activeTabId, onTabChange, onDeleteTab }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: tab.id })

  const style = {
    transform: `translate3d(${transform?.x ?? 0}px, 0, 0)`,
    transition
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onTabChange(tab.id)}
      className={`flex items-center px-3 py-2 mr-1 rounded-t-md transition-all cursor-grab ${
        activeTabId === tab.id
          ? 'bg-background border-t-2 border-primary'
          : 'hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      <img src={tab.icon} alt={tab.title} className="w-4 h-4 mr-2" />
      <span className="text-sm max-w-[120px] truncate">{tab.title}</span>
      <button
        className="ml-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        onClick={(e) => {
          e.stopPropagation()
          onDeleteTab(tab.id)
        }}
      >
        {/* X icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3 w-3"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414
              1.414L11.414 10l4.293 4.293a1 1
              0 01-1.414 1.414L10 11.414l-4.293
              4.293a1 1 0 01-1.414-1.414L8.586
              10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  )
}

const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onDeleteTab,
  onNewTab,
  onReorder
}) => {
  const [search, setSearch] = useState('')

  const filtered = tabs.filter(
    (tab) =>
      tab.title.toLowerCase().includes(search.toLowerCase()) ||
      tab.url.toLowerCase().includes(search.toLowerCase())
  )

  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((t) => t.id === active.id)
      const newIndex = tabs.findIndex((t) => t.id === over.id)
      onReorder(arrayMove(tabs, oldIndex, newIndex))
    }
  }

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 px-2">
      {/* menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="mr-1 rounded-full">
            {/* chevron */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 
                  4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 bg-popover text-popover-foreground shadow-md rounded-md p-2">
          <Input
            placeholder="Search tabs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2"
          />
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((tab) => (
              <DropdownMenuItem
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex items-center px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <img src={tab.icon} alt={tab.title} className="w-4 h-4 mr-2" />
                <span className="text-sm truncate">{tab.title}</span>
              </DropdownMenuItem>
            ))}
            {!filtered.length && (
              <div className="px-2 py-1 text-sm text-gray-500">No matching tabs</div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* draggable list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToHorizontalAxis]}
      >
        <SortableContext items={tabs.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex-1 flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <SortableTabItem
                key={tab.id}
                tab={tab}
                activeTabId={activeTabId}
                onTabChange={onTabChange}
                onDeleteTab={onDeleteTab}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* add button */}
      <button
        onClick={onNewTab}
        className="ml-1 p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
      >
        {/* plus */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 
              0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  )
}

export default TabBar
