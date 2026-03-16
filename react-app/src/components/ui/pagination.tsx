import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/utils/cn"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  )
}

function PaginationItem(props: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<
  React.ComponentProps<typeof Button>,
  "size" | "variant" | "onClick" | "disabled" | "className" | "children" | "aria-label"
>

function PaginationLink({
  className,
  isActive,
  size = "icon",
  variant = isActive ? "default" : "ghost",
  ...props
}: PaginationLinkProps) {
  return (
    <Button
      data-slot="pagination-link"
      data-active={isActive}
      variant={variant}
      size={size}
      className={cn("min-h-[44px] min-w-[44px]", className)}
      {...props}
    />
  )
}

function PaginationPrevious(
  props: Omit<PaginationLinkProps, "children" | "aria-label">
) {
  return (
    <PaginationLink
      aria-label="Предыдущая страница"
      size="default"
      className="gap-1 pl-2.5"
      {...props}
    >
      <ChevronLeftIcon className="size-4" />
      <span>Назад</span>
    </PaginationLink>
  )
}

function PaginationNext(
  props: Omit<PaginationLinkProps, "children" | "aria-label">
) {
  return (
    <PaginationLink
      aria-label="Следующая страница"
      size="default"
      className="gap-1 pr-2.5"
      {...props}
    >
      <span>Вперёд</span>
      <ChevronRightIcon className="size-4" />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex h-9 w-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">Ещё страницы</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
