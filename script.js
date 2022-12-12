let tree, deMOSSables = []
const codeInput0 = document.getElementById('code-input-0')
const codeInput = document.getElementById('code-input')
const outputContainer = document.getElementById('output-container')
const outputContainerScroll = document.getElementById('output-container-scroll')
const updateTimeSpan = document.getElementById('update-time')
	// outputContainerScroll.hidden = false
	;
(async () => {
	const CAPTURE_REGEX = /@\s*([\w\._-]+)/g

	loadState()

	await TreeSitter.init()

	window.parser = new TreeSitter()
	const config = {
		lineNumbers: true,
		showCursorWhenSelecting: true,
		mode: 'text/x-c++src'
	}
	window.codeEditor0 = CodeMirror.fromTextArea(codeInput0, config)
	window.codeEditor = CodeMirror.fromTextArea(codeInput, config)

	const cluster = new Clusterize({
		rows: [],
		noDataText: null,
		contentElem: outputContainer,
		scrollElem: outputContainerScroll
	})
	const renderTreeOnCodeChange = debounce(renderTree, 50)
	const saveStateOnChange = debounce(saveState, 2000)
	const runTreeQueryOnChange = debounce(runTreeQuery, 50)

	let treeRows = null
	let treeRowHighlightedIndex = -1
	let parseCount = 0
	let isRendering = 0
	window.query = null

	codeEditor0.on('changes', handleCodeChange)
	codeEditor.on('changes', handleCodeChange)
	codeEditor.on('viewportChange', runTreeQueryOnChange)
	codeEditor.on('cursorActivity', debounce(handleCursorMovement, 150))
	outputContainer.addEventListener('click', handleTreeClick)

	tree = null
	parser.setLanguage(await TreeSitter.Language.load("tree-sitter-cpp.wasm"))
	handleCodeChange()


	async function handleCodeChange(editor, changes) {
		const newText = codeEditor.getValue() + '\n'
		const edits = tree && changes && changes.map(treeEditForEditorChange)

		// const start = performance.now()
		if (edits)
			for (const edit of edits)
				tree.edit(edit)

		const newTree = parser.parse(newText, tree)
		// console.log(newTree)
		// const duration = (performance.now() - start).toFixed(1)

		// updateTimeSpan.innerText = `${duration} ms`
		if (tree) tree.delete()
		tree = newTree
		parseCount++
		renderTreeOnCodeChange()
		runTreeQueryOnChange()
		saveStateOnChange()
	}

	async function renderTree() {
		isRendering++
		const cursor = tree.walk()

		let currentRenderCount = parseCount
		let row = ''
		let rows = []
		let finishedRow = false
		let visitedChildren = false
		let indentLevel = 0

		let rowCount = 0
		for (let i = 0; ; i++) {
			if (i > 0 && i % 10000 === 0) {
				await new Promise(r => setTimeout(r, 0))
				if (parseCount !== currentRenderCount) {
					cursor.delete()
					isRendering--
					return
				}
			}

			let displayName = cursor.nodeType
			if (cursor.nodeIsMissing) cursor.nodeType = `MISSING ${cursor.nodeType}`
			// else if (cursor.nodeIsNamed) {
			// 	displayName = cursor.nodeType
			// }

			if (visitedChildren) {
				if (displayName) {
					finishedRow = true
				}

				if (cursor.gotoNextSibling()) {
					visitedChildren = false
				} else if (cursor.gotoParent()) {
					visitedChildren = true
					indentLevel--
				} else {
					break
				}
			} else {
				if (displayName) {
					if (finishedRow) {
						// row += '</div>'
						rows.push(row)
						finishedRow = false
					}
					const start = cursor.startPosition
					const end = cursor.endPosition
					const id = cursor.nodeId
					let fieldName = cursor.currentFieldName()
					if (fieldName) {
						fieldName += ': '
					} else {
						fieldName = ''
					}

					// row = `<div>${'  '.repeat(indentLevel)}${fieldName}<a class='plain' href="#" data-id=${id} data-range="${start.row},${start.column},${end.row},${end.column}">${displayName}</a>`
					if (rowCount != start.row) {
						row = "<hr>"
						rowCount = start.row
					} else {
						row = "<br>"
					}
					row += `${'  '.repeat(indentLevel)}`
					if (cursor.nodeIsNamed)
						row += `${fieldName}`
					else
						row += `<i>${fieldName}</i>`
					row += `<a class='plain' data-id=${id} data-range="${start.row},${start.column},${end.row},${end.column}">${displayName}</a>`
					// row += `${codeEditor.getDoc().getRange({ line: start.row, ch: start.column }, { line: end.row, ch: end.column })}`

					finishedRow = true
				}

				if (cursor.gotoFirstChild()) {
					visitedChildren = false
					indentLevel++
				} else {
					visitedChildren = true
				}
			}
		}
		if (finishedRow) {
			// row += '</div>'
			row += "<hr>"
			rows.push(row)
		}

		cursor.delete()
		cluster.update(rows)
		treeRows = rows
		isRendering--
		handleCursorMovement()
	}

	function handleCursorMovement() {
		if (isRendering) return

		const selection = codeEditor.doc.listSelections()[0]
		let start = { row: selection.anchor.line, column: selection.anchor.ch }
		let end = { row: selection.head.line, column: selection.head.ch }
		if (
			start.row > end.row ||
			(
				start.row === end.row &&
				start.column > end.column
			)
		) {
			let swap = end
			end = start
			start = swap
		}
		const node = tree.rootNode.descendantForPosition(start, end)
		if (treeRows) {
			if (treeRowHighlightedIndex !== -1) {
				const row = treeRows[treeRowHighlightedIndex]
				if (row) treeRows[treeRowHighlightedIndex] = row.replace('highlighted', 'plain')
			}
			treeRowHighlightedIndex = treeRows.findIndex(row => row.includes(`data-id=${node.id} `))
			if (treeRowHighlightedIndex !== -1) {
				const row = treeRows[treeRowHighlightedIndex]
				// codeEditorMark(/\d+,\d+,\d+,\d/.exec(row)[0])
				if (row) treeRows[treeRowHighlightedIndex] = row.replace('plain', 'highlighted')
			}
			cluster.update(treeRows)
			const lineHeight = cluster.options.item_height
			const scrollTop = outputContainerScroll.scrollTop
			const containerHeight = outputContainerScroll.clientHeight
			const offset = treeRowHighlightedIndex * lineHeight
			if (scrollTop > offset - 20) {
				$(outputContainerScroll).animate({ scrollTop: offset - 20 }, 150)
			} else if (scrollTop < offset + lineHeight + 40 - containerHeight) {
				$(outputContainerScroll).animate({ scrollTop: offset - containerHeight + 40 }, 150)
			}
		}
	}

	function handleTreeClick(event) {
		if (event.target.tagName === 'A') {
			event.preventDefault()
			const [startRow, startColumn, endRow, endColumn] =
				event.target.dataset.range.split(',').map(n => parseInt(n))
			codeEditor.focus()
			codeEditor.setSelection(
				{ line: startRow, ch: startColumn },
				{ line: endRow, ch: endColumn }
			)
		}
	}


	function treeEditForEditorChange(change) {
		const oldLineCount = change.removed.length
		const newLineCount = change.text.length
		const lastLineLength = change.text[newLineCount - 1].length

		const startPosition = { row: change.from.line, column: change.from.ch }
		const oldEndPosition = { row: change.to.line, column: change.to.ch }
		const newEndPosition = {
			row: startPosition.row + newLineCount - 1,
			column: newLineCount === 1
				? startPosition.column + lastLineLength
				: lastLineLength
		}

		const startIndex = codeEditor.indexFromPos(change.from)
		let newEndIndex = startIndex + newLineCount - 1
		let oldEndIndex = startIndex + oldLineCount - 1
		for (let i = 0; i < newLineCount; i++) newEndIndex += change.text[i].length
		for (let i = 0; i < oldLineCount; i++) oldEndIndex += change.removed[i].length

		return {
			startIndex, oldEndIndex, newEndIndex,
			startPosition, oldEndPosition, newEndPosition
		}
	}

	function loadState() {
		const sourceCode0 = localStorage.getItem("sourceCode0")
		if (sourceCode0 != null) codeInput0.value = sourceCode0
		const sourceCode = localStorage.getItem("sourceCode")
		if (sourceCode != null) codeInput.value = sourceCode
	}

	function saveState() {
		localStorage.setItem("sourceCode0", codeEditor0.getValue())
		localStorage.setItem("sourceCode", codeEditor.getValue())
	}

	function debounce(func, wait, immediate) {
		var timeout
		return function () {
			var context = this, args = arguments
			var later = function () {
				timeout = null
				if (!immediate) func.apply(context, args)
			}
			var callNow = immediate && !timeout
			clearTimeout(timeout)
			timeout = setTimeout(later, wait)
			if (callNow) func.apply(context, args)
		}
	}

	function runTreeQuery() {
		for (let m of codeEditor.getAllMarks()) m.clear()
		for (const w of deMOSSables) w.widget.clear()
		deMOSSables = []
		$("#status").text("")
		if (!enable_demosser.checked) return

		let i = -1
		const viewport = codeEditor.getViewport()
		for (let x of tricks) {
			const expected_param_count = x.match.match(/@\w+/g).length
			if (query) {
				query.delete()
				query.deleted = true
				query = null
			}
			// try {
			query = parser.getLanguage().query(x.match)
			const captures = query.captures(
				tree.rootNode,
				{ row: viewport.from, column: 0 },
				{ row: viewport.to, column: 0 },
			)
			let names = {}
			let count = 0
			for (let k = captures.length - 1; k >= 0; k--) {
				names[captures[k].name] = captures[k].node.text
				count++
				if (captures[k].name == 'match') {
					if (count == expected_param_count) {
						const { startPosition, endPosition } = captures[k].node
						const css = `background: hsla(${i++ * (1e7 + 1) % 360}, 100%, 90%, 50%)`;
						const trick = {
							trick: x,
							start: { line: startPosition.row, ch: startPosition.column },
							end: { line: endPosition.row, ch: endPosition.column },
							names: names,
							widget: codeEditor.addLineWidget(
								startPosition.row,
								$(`<button style="${css}" onclick="applyTrick(${deMOSSables.length})">${x.name}</button>`)[0],
								{ above: true }
							)
						}
						codeEditor.markText(
							trick.start, trick.end,
							{ css: css, attributes: { title: demossText(trick) } }
						)
						deMOSSables.push(trick)
					}
					names = {}
					count = 0
				}
			}
			// } catch (error) {

			// }

		}
		$("#status").text(`${deMOSSables.length} changes can be made.`)
	}

})()
function applyTrick(index) {
	const x = deMOSSables[index]
	let text = demossText(x);
	codeEditor.operation(e => {
		codeEditor.replaceRange(text, x.start, x.end)
		codeEditor.setSelection(x.start, codeEditor.posFromIndex(codeEditor.indexFromPos(x.start) + text.length))
	})
	x.widget.clear()
}

function demossText(x) {
	let text
	if (typeof x.trick.replace == 'string') {
		text = x.trick.replace;
		for (const name in x.names)
			text = text.replace("@" + name, x.names[name]);
	} if (typeof x.trick.replace == 'object') {
		text = codeEditor.getRange(x.start, x.end);
		for (const item in x.trick.replace)
			text = text.replace(x.names[item], x.trick.replace[item]);
	}
	return text.trim();
}