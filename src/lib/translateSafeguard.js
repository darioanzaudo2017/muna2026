// Google Translate (y extensiones similares) reescriben nodos de texto del DOM
// por fuera de React. Cuando React después intenta actualizar esos mismos nodos
// (removeChild/insertBefore), el nodo ya no está donde React espera y el navegador
// tira un DOMException que corta el render a la mitad, dejando la UI a medias.
// Parche estándar: si el nodo a remover/insertar ya no es hijo del padre esperado,
// no crashear — solo loguear y seguir.
export function installTranslateSafeguard() {
  if (typeof Node !== 'function' || !Node.prototype) return

  const originalRemoveChild = Node.prototype.removeChild
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) {
      console.warn('[translateSafeguard] removeChild evitado: el nodo ya no es hijo del padre esperado (probablemente el traductor del navegador movió el DOM).')
      return child
    }
    return originalRemoveChild.apply(this, arguments)
  }

  const originalInsertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      console.warn('[translateSafeguard] insertBefore evitado: el nodo de referencia ya no es hijo del padre esperado (probablemente el traductor del navegador movió el DOM).')
      return newNode
    }
    return originalInsertBefore.apply(this, arguments)
  }
}
