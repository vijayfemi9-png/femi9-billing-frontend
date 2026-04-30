// index.tsx
import React, { useEffect, useState, useRef } from "react";
import { Pagination, Select, Table } from "antd";
import type { DatatableProps } from "../../core/data/interface";

const { Option } = Select;

const Datatable: React.FC<DatatableProps> = ({
  columns,
  dataSource,
  Selection,
  searchText,
  expandable,
  onRow,
  rowClassName,
  size,
}) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
  const [Selections, setSelections] = useState<any>(true);
  const [filteredDataSource, setFilteredDataSource] = useState(dataSource);
  const [pageSize, setPageSize] = useState(10);
  const [current, setCurrent] = useState(1);

  // Debounce searchText
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300); // 300ms debounce
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [searchText]);

  useEffect(() => {
    setSelections(Selection);
  }, [Selection]);

  useEffect(() => {
    const filteredData = dataSource.filter((record) =>
      Object.values(record).some((field) =>
        String(field).toLowerCase().includes((debouncedSearchText || "").toLowerCase())
      )
    );
    setFilteredDataSource(filteredData);
    setCurrent(1); // Reset to first page on search
  }, [debouncedSearchText, dataSource]);

  const onSelectChange = (newSelectedRowKeys: any[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const handlePageChange = (page: number, pageSize: number) => {
    setCurrent(page);
    setPageSize(pageSize);
  };

  return (
    <>
      {/* Table Container - Strict horizontal boundary so row/pagination is safe */}
      <div className="table-responsive mb-3 w-100">
        <Table
          className="table-nowrap"
          size={size || "middle"}
          rowSelection={Selections ? rowSelection : undefined}
          columns={columns}
          rowHoverable={false}
          rowKey={(record: any) => String(record.id ?? record.key ?? JSON.stringify(record))}
          dataSource={filteredDataSource.slice((current - 1) * pageSize, current * pageSize)}
          pagination={false}
          expandable={expandable}
          onRow={onRow}
          rowClassName={rowClassName}
        />
      </div>

      <div className="d-flex align-items-center justify-content-between pb-4 w-100">
        {/* Left side: show entries */}
        <div className="datatable-length text-muted">
          <label className="d-flex align-items-center mb-0 text-dark fw-medium fs-14">
            <span>Show</span>
            <Select
              value={pageSize}
              onChange={(value) => handlePageChange(1, value)} // reset to page 1
              style={{ width: 80, margin: '0 10px' }}
              size="middle"
            >
              <Option value={10}>10</Option>
              <Option value={25}>25</Option>
              <Option value={50}>50</Option>
              <Option value={100}>100</Option>
            </Select>
            <span>entries</span>
          </label>
        </div>

        {/* Right side: pagination */}
        <div className="d-flex justify-content-end align-items-center">
          <Pagination
            current={current}
            pageSize={pageSize}
            total={filteredDataSource.length}
            onChange={handlePageChange}
            size="default"
            showSizeChanger={false}
            className="d-flex align-items-center"
            itemRender={(_page, type, originalElement) => {
              if (type === 'prev') {
                return (
                  <span className="d-flex align-items-center justify-content-center h-100 w-100">
                    <i className="ti ti-chevron-left fs-14" />
                  </span>
                );
              }
              if (type === 'next') {
                return (
                  <span className="d-flex align-items-center justify-content-center h-100 w-100">
                    <i className="ti ti-chevron-right fs-14" />
                  </span>
                );
              }
              return originalElement;
            }}
          />
        </div>
      </div>
    </>
  );
};

export default Datatable;
