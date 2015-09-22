require! './index.styl'

room = window.location.pathname |> (.substr 1) |> decode-URI-component

unless room
  room := 'xxxxxx'.replace /[x]/g, -> (Math.random!*36.|.0).to-string 36
  window.history.replaceState {}, 'Random Room', "/#room"

document.write (require './canvas.jade')!

canvas = document.get-element-by-id \main-canvas
canvas.width = window.inner-width
canvas.height = window.inner-height
window.add-event-listener \resize !->
  img = new Image!
  img.src = canvas.to-data-URL \image/png
  img.onload = !->
    canvas.width = window.inner-width
    canvas.height = window.inner-height
    ctx.draw-image img, 0 0

ctx = canvas.get-context \2d

color = local-storage.color or \#000000
document.get-element-by-id \color-picker
  ..value = color
  ..onchange = !->
    color := @value
    local-storage.color = color
    #SKETCH.net.send('color', color);

var prev-x, prev-y
is-mouse-down = false

down = !->
  prev-x := it.offset-x
  prev-y := it.offset-y
  is-mouse-down := true
  #SKETCH.net.send('mouse', 0, it.offset-x, it.offset-y);

move = !->
  return unless is-mouse-down
  ctx.stroke-style = color
  ctx.begin-path!
  ctx.move-to prev-x, prev-y
  ctx.line-to it.offset-x, it.offset-y
  prev-x := it.offset-x
  prev-y := it.offset-y
  ctx.stroke!
  #SKETCH.net.send('mouse', 1, it.offset-x, it.offset-y);

up = !->
  is-mouse-down := false
  #SKETCH.net.send('mouse', 2, event.offset-x, event.offset-y);


document.add-event-listener \mousedown  down
document.add-event-listener \touchstart !-> it.prevent-default!; down it.target-touches[0]
document.add-event-listener \mousemove  move
document.add-event-listener \touchmove  !-> move it.target-touches[0]
document.add-event-listener \mouseup    up
document.add-event-listener \touchend   !-> up it.target-touches[0]
