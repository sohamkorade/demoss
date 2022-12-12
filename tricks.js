const tricks = [
	{
		name: "for->while",
		match: `
(for_statement
	initializer:(_)@init
	condition:(_)@cond
	update:(_)@inc
	(_)@body
)@match
`,
		replace: `
{@init
while(@cond){
	@body
	@inc;
}}`},
	{
		name: "less -> greater",
		match: `
(binary_expression
	left: (_)@left
	operator: "<"
	right: (_)@right
)@match
`,
		replace: `
@right > @left
`},
	{
		name: "greater -> less",
		match: `
(binary_expression
left: (_)@left
operator: ">"
right: (_)@right
)@match
`,
		replace: `
@right < @left
`},
	{
		name: "++ -> +=1",
		match: `(update_expression operator:"++"@op)@match`,
		replace: { op: ' += 1' }
	},
	{
		name: "-- -> -=1",
		match: `(update_expression operator:"--"@op)@match`,
		replace: { op: ' -= 1' }
	}, {
		name: "swap if-else",
		match: `
		(if_statement
			condition: (_)@cond
			consequence: (_)@cons
			alternative: (_)@alt
		)@match`,
		replace: `if (!@cond) @alt else @cons`
	}, {
		name: "((x)) -> (x)",
		match: `
		(parenthesized_expression 
			(parenthesized_expression)@p1 
			)@match`,
		replace: `@p1`
	},
	{
		name: "unary op(x) -> unary op x",
		match: `
		(unary_expression
			operator: _@op
			argument: (parenthesized_expression(_)@x)
			)@match`,
		replace: `@op@x`
	}
]