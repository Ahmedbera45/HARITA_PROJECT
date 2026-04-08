import { TablePagination } from '@mui/material';

export default function PaginationBar({ total, page, pageSize, onPageChange, onPageSizeChange }) {
  return (
    <TablePagination
      component="div"
      count={total}
      page={page - 1}
      rowsPerPage={pageSize}
      rowsPerPageOptions={[10, 20, 50, 100]}
      onPageChange={(_, newPage) => onPageChange(newPage + 1)}
      onRowsPerPageChange={(e) => { onPageSizeChange(parseInt(e.target.value, 10)); onPageChange(1); }}
      labelRowsPerPage="Sayfa başına:"
      labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
    />
  );
}
