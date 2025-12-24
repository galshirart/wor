function hideCursor() {
    $('*').css('cursor', 'none');
}
function showCursor() {
    $('*').css('cursor', 'url(assets/cursor.svg), auto');
}
$(document).on('mousemove', showCursor);

function i(element, param) {
   	el = $(element)
    if (el.length === 0) return
    value = el.css(param)
    return value ? number(value) : 0
}
