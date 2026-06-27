"use client";

import { type ReactNode, Children, isValidElement } from "react";
import ColumnPicker, { useVisibleColumns, type ColumnDef } from "./ColumnPicker";

interface Props {
  columns: ColumnDef[];
  children: ReactNode;
}

export default function ColumnsLayout({ columns, children }: Props) {
  const { visible, loaded, toggle, showAll } = useVisibleColumns(columns);

  const childArray = Children.toArray(children).filter(isValidElement);

  const visibleChildren = childArray.filter((child) => {
    const id = (child.props as { "data-column-id"?: string })["data-column-id"];
    return id ? visible.has(id) : true;
  });

  return (
    <>
      <div className="flex items-center justify-end mb-3">
        <ColumnPicker
          columns={columns}
          visible={visible}
          onToggle={toggle}
          onShowAll={showAll}
        />
      </div>
      <div className="flex gap-4" style={{ minWidth: "max-content", opacity: loaded ? 1 : 0, transition: "opacity 150ms" }}>
        {visibleChildren}
      </div>
    </>
  );
}
