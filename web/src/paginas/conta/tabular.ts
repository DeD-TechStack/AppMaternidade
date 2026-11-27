import { fireEvent } from '@testing-library/react'

// Apoio dos testes de teclado: modela o Tab e o Enter/Espaço como o navegador os faz. Não importa nada do
// código do site, para que um erro lá não se repita aqui.

const CANDIDATOS = 'a[href], button, input, select, textarea, [tabindex]'

function ehRadio(elemento: HTMLElement): elemento is HTMLInputElement {
  return elemento instanceof HTMLInputElement && elemento.type === 'radio'
}

function alcancavel(elemento: HTMLElement): boolean {
  if (elemento.matches(':disabled')) return false
  if (elemento.closest('[hidden], [inert]')) return false
  if (elemento instanceof HTMLInputElement && elemento.type === 'hidden') return false
  return elemento.tabIndex >= 0
}

/**
 * As paradas do Tab da página, na ordem do documento. Um grupo de botões de opção (mesmo `name` e mesmo
 * formulário) é UMA parada só: a opção marcada; sem nenhuma marcada, a primeira se o Tab vai adiante e a
 * última se ele volta. Ficam de fora o que está `disabled`, `hidden` ou com `tabindex="-1"`.
 */
export function paradasDeTab(retroceder: boolean): HTMLElement[] {
  const todos = [...document.querySelectorAll<HTMLElement>(CANDIDATOS)].filter(alcancavel)
  const radios = todos.filter(ehRadio)
  const paradaDoGrupo = (radio: HTMLInputElement) => {
    const grupo = radios.filter((outro) => outro.name === radio.name && outro.form === radio.form)
    return grupo.find((outro) => outro.checked) ?? grupo[retroceder ? grupo.length - 1 : 0]
  }
  return todos.filter((elemento) => !ehRadio(elemento) || !elemento.name || paradaDoGrupo(elemento) === elemento)
}

/**
 * Um Tab (ou Shift+Tab): o `keydown` vai ao elemento em foco e, se a página não o cancelou, o foco anda à
 * próxima parada da página inteira e dá a volta no fim. Devolve o elemento que ficou em foco.
 */
export function tabular(retroceder = false): HTMLElement {
  const ativo = document.activeElement as HTMLElement
  if (!fireEvent.keyDown(ativo, { key: 'Tab', shiftKey: retroceder })) return document.activeElement as HTMLElement

  const paradas = paradasDeTab(retroceder)
  const indice = paradas.indexOf(ativo)
  let destino: HTMLElement | undefined
  if (indice >= 0) {
    destino = paradas[(indice + (retroceder ? -1 : 1) + paradas.length) % paradas.length]
  } else {
    // Quem está em foco não é uma parada (um botão de opção sem marca, o `body`): vai à vizinha na ordem do documento.
    destino = retroceder
      ? [...paradas].reverse().find((parada) => ativo.compareDocumentPosition(parada) & Node.DOCUMENT_POSITION_PRECEDING)
      : paradas.find((parada) => ativo.compareDocumentPosition(parada) & Node.DOCUMENT_POSITION_FOLLOWING)
    destino ??= paradas[retroceder ? paradas.length - 1 : 0]
  }
  destino.focus()
  return document.activeElement as HTMLElement
}

/**
 * Enter ou Espaço num botão como o navegador faz: o `keydown` primeiro; se a página não o cancelou, o Enter
 * clica na hora e o Espaço clica ao soltar a tecla. `fireEvent.keyDown` sozinho não ativa nada.
 */
export function pressionar(alvo: HTMLElement, tecla: 'Enter' | ' '): void {
  const seguiu = fireEvent.keyDown(alvo, { key: tecla })
  if (tecla === 'Enter') {
    if (seguiu) fireEvent.click(alvo)
    return
  }
  const soltou = fireEvent.keyUp(alvo, { key: tecla })
  if (seguiu && soltou) fireEvent.click(alvo)
}
