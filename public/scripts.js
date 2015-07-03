jQuery(function ($) {
  $('[data-toggle="tooltip"]').tooltip();

  $('table').stickyTableHeaders();
  $('table.data-table').DataTable({
    deferRender: true,
    info: false,
    paging: false,
    searching: false
  });
});