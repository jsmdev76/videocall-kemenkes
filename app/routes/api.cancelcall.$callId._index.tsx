import { type ActionFunctionArgs } from '@remix-run/cloudflare'
import getClientToken, {
	removeClientToken,
} from '~/utils/getClientToken.server'
import getDoctorToken from '~/utils/getDoctorToken.server'

export const action = async ({
	params,
	request,
	context,
}: ActionFunctionArgs) => {
	const host = context.URL_API
	console.log(params)
	let trxClientToken = await getClientToken(request)
	let doctorToken = await getDoctorToken(request)
	console.log('trxClientToken', trxClientToken)
	console.log('doctorToken', doctorToken)
	// if(!trxClientToken) {
	// 	if(doctorToken)
	// 		throw redirect('/doctor');
	// 	else
	// 		throw redirect('/set-username');
	// }
	const response = await fetch(`${host}/call/cancel`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': context.API_SECRET_KEY as string,
		},
		body: JSON.stringify({
			callId: Number(params.callId),
			reason: 'client',
		}),
	})
	let data: any = await response.json()
	console.log('data', data)
	// return data;
	if (!data.success) {
		throw new Response(data.message, { status: 500 })
	}
	// clear session
	let url = '/end-room/client'
	// if(doctorToken)
	// 	url = '/doctor/dashboard';
	console.log('url', url)
	// return url;
	return removeClientToken(request, url)
}
