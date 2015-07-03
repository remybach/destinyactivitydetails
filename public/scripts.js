jQuery(function ($) {
  $('[data-toggle="tooltip"]').tooltip();

  $('table').stickyTableHeaders();
  $('table.data-table').DataTable({
    deferRender: true,
    info: false,
    paging: false,
    searching: false
  });

  // Enable hotlinking directly to players.
  $('.collapse').on($.support.transition.end, function() {
    var hash = '#' + this.id.replace('collapse-', '');

    location.hash = "";
    location.hash = hash;
  });
  
  if (location.hash) {
    // This is absurd, but seemingly necessary to get the page to scroll to the hash on load.
    $("#collapse-" + location.hash.slice(1)).collapse('show');
  }
});