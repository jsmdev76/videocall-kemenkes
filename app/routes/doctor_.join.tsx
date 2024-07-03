import { redirect, type ActionFunctionArgs } from '@remix-run/cloudflare'
import { setDoctorToken } from '~/utils/getDoctorToken.server'

export const action = async ({
	params,
	request,
	context,
}: ActionFunctionArgs) => {
	const host = context.URL_API
	const url = new URL(request.url)
	const callId = url.searchParams.get('callId')
	const roomId = url.searchParams.get('roomId')

	const response = await fetch(`${host}/call/action`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			callId,
			action: "accept"
		}),

	})
	let data: any = await response.json()
	console.log(data)
	return setDoctorToken("doctor", `${data.data.call.agentName} | Agent`, request, `/${data.data.call.roomId}/room`)
	// throw redirect(`/${roomId}/room`)
}
