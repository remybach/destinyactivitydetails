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
  $('.js-player-name').on('click', function() {
    $(this).parent().find('.js-collapse-toggle').trigger('click');
  });
  
  if (location.hash) {
    // This is absurd, but seemingly necessary to get the page to scroll to the hash on load.
    $("#collapse-" + location.hash.slice(1)).collapse('show').one($.support.transition.end, function() {
      var hash = location.hash;

      location.hash = "";
      location.hash = hash;
    });
  }
});