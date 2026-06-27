"use client";

import { type ReactNode, Children, isValidElement } from "react";
import ColumnPicker, { useVisibleColumns, type ColumnDef } from "./ColumnPicker";
import ScrollHint from "./ScrollHint";

interface Props {
  columns: ColumnDef[];
  filterBar?: ReactNode;
  children: ReactNode;
}

export default function ColumnsLayout({ columns, filterBar, children }: Props) {
  const { visible, loaded, toggle, showAll } = useVisibleColumns(columns);

  const childArray = Children.toArray(children).filter(isValidElement);

  const visibleChildren = childArray.filter((child) => {
    const id = (child.props as { "data-column-id"?: string })["data-column-id"];
    return id ? visible.has(id) : true;
  });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {filterBar}
        <div className="ml-auto">
          <ColumnPicker
            columns={columns}
            visible={visible}
            onToggle={toggle}
            onShowAll={showAll}
          />
        </div>
      </div>
      <ScrollHint>
        <div className="flex gap-4" style={{ minWidth: "max-content", opacity: loaded ? 1 : 0, transition: "opacity 150ms" }}>
          {visibleChildren}
        </div>
      </ScrollHint>
    </>
  );
}
