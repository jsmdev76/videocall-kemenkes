import { json, type ActionFunctionArgs } from '@remix-run/cloudflare'

export const action = async ({
	request,
	context,
	params,
}: ActionFunctionArgs) => {
	const host = context.URL_API
	const response = await fetch(`${host}/call/extend-call`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': context.API_SECRET_KEY as string,
		},
		body: JSON.stringify({
			roomId: params.roomId,
		}),
	})
	let data: any = await response.json()
	return json(data)
}
