'use client'

import * as React from 'react'
import { GripVerticalIcon } from 'lucide-react'
import {
  Group as ResizableGroup,
  Panel as ResizablePanelPrimitive,
  Separator as ResizableSeparator,
} from 'react-resizable-panels'

import { cn } from '@/lib/utils'

function ResizablePanelGroup({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof ResizableGroup>) {
  return (
    <ResizableGroup
      data-slot="resizable-panel-group"
      orientation={orientation}
      className={cn('flex h-full w-full', className)}
      {...props}
    />
  )
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof ResizablePanelPrimitive>) {
  return <ResizablePanelPrimitive data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizableSeparator> & {
  withHandle?: boolean
}) {
  return (
    <ResizableSeparator
      data-slot="resizable-handle"
      className={cn(
        'bg-border focus-visible:ring-ring relative z-30 flex h-full w-2 shrink-0 cursor-col-resize items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-4 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-none aria-[orientation=vertical]:h-2 aria-[orientation=vertical]:w-full aria-[orientation=vertical]:cursor-row-resize aria-[orientation=vertical]:after:inset-x-0 aria-[orientation=vertical]:after:top-1/2 aria-[orientation=vertical]:after:h-4 aria-[orientation=vertical]:after:w-full aria-[orientation=vertical]:after:-translate-y-1/2 aria-[orientation=vertical]:after:translate-x-0 [&[aria-orientation=vertical]>div]:rotate-90',
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </ResizableSeparator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
