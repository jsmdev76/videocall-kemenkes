import { redirect } from '@remix-run/cloudflare'
import { commitSession, getSession } from '~/session'

export async function setDoctorToken(
	doctorToken: string,
	doctorName: string,
	request: Request,
	returnUrl: string = '/'
) {
	const session = await getSession(request.headers.get('Cookie'))
	session.set('doctortoken', doctorToken)
	session.set('username', doctorName)
	// window.localStorage.setItem("isDoctor", "1");
	// create cookie localy

	throw redirect(returnUrl, {
		headers: {
			'Set-Cookie': await commitSession(session),
		},
	})
}

export async function removeDoctorToken(
	request: Request,
	returnUrl: string = '/'
) {
	const session = await getSession(request.headers.get('Cookie'))
	session.set('doctortoken', '')
	// window.localStorage.removeItem("isDoctor");
	throw redirect(returnUrl, {
		headers: {
			'Set-Cookie': await commitSession(session),
		},
	})
}

/**
 * Utility for getting the username. In prod, this basically
 * just consists of getting the Cf-Access-Authenticated-User-Email
 * header, but in dev we allow manually setting this via the
 * username query param.
 */
export default async function getDoctorToken(request: Request) {
	const session = await getSession(request.headers.get('Cookie'))
	const sessionDoctorToken = session.get('doctortoken')
	if (typeof sessionDoctorToken === 'string') return sessionDoctorToken

	return null
}