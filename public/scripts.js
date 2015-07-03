jQuery(function ($) {
  $('[data-toggle="tooltip"]').tooltip();

  $('table').stickyTableHeaders();
  $('table.data-table').DataTable({
    info: false,
    paging: false,
    scrollX: false,
    searching: false
  });
});