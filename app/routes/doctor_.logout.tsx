import { redirect, type ActionFunctionArgs } from '@remix-run/cloudflare'
import getDoctorToken, {
	removeDoctorToken,
} from '~/utils/getDoctorToken.server'

export const action = async ({
	params,
	request,
	context,
}: ActionFunctionArgs) => {
	const host = context.URL_API
	const url = new URL(request.url)
	let doctorToken = await getDoctorToken(request)
	console.log('doctorToken', doctorToken)
	if (!doctorToken) {
		throw redirect('/doctor')
	}
	const response = await fetch(`${host}/logout`, {
		method: 'post',
		headers: {
			Authorization: 'Bearer ' + doctorToken,
		},
	})
	let data: any = await response.json()
	console.log('data', data)
	// return data;
	if (!data.success) {
		if (data.data != undefined) {
			if (data.data.isfound == false) {
				// clear session
				return removeDoctorToken(request, `/doctor`)
			}
		}
		throw new Response(data.message, { status: 500 })
	}
	// clear session
	return removeDoctorToken(request, `/doctor`)
}
