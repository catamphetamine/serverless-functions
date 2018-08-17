// Strips leading tabulation.
export function untab(text) {
	text = text.replace(/^\n/, '').replace(/\n$/, '')
	let lines = text.split('\n')

	while (/^\s*$/.test(lines[0])) {
		lines.shift()
	}

	while (/^\s*$/.test(lines[lines.length - 1])) {
		lines.pop()
	}

	let leastTabs = Number.POSITIVE_INFINITY
	for (const line of lines) {
		if (!/^\s*$/.test(line)) {
			leastTabs = Math.min(leastTabs, countTabs(line))
		}
	}

	if (leastTabs === Number.POSITIVE_INFINITY) {
		return lines.join('\n')
	}

	return lines.map(line => line.slice(leastTabs)).join('\n').replace(/\t/g, '  ')
}

export function tab(text, count) {
	return text.split('\n').map(line => repeat('\t', count) + line).join('\n')
}

function countTabs(text) {
	var count = 0;
	var index = 0;
	while (text.charAt(index++) === '\t') {
		count++
	}
	return count
}

function repeat(string, count) {
	let result = ''
	while (count > 0) {
		result += string
		count--
	}
	return result
}