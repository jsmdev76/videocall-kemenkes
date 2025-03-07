import { redirect } from '@remix-run/cloudflare'
import { commitSession, getSession } from '~/session'

export async function setClientToken(
	request: Request,
	returnUrl: string,
	trxClientToken: string
) {
	const session = await getSession(request.headers.get('Cookie'))
	session.set('clienttoken', trxClientToken)
	throw redirect(returnUrl, {
		headers: {
			'Set-Cookie': await commitSession(session),
		},
	})
}

export default async function getClientToken(request: Request) {
	// const accessUsername = request.headers.get(
	// 	ACCESS_AUTHENTICATED_USER_EMAIL_HEADER
	// )
	// if (accessUsername) return accessUsername

	const session = await getSession(request.headers.get('Cookie'))
	const sessionClientToken = session.get('clienttoken')
	console.log('sessionClientToken', sessionClientToken)
	if (typeof sessionClientToken === 'string') return sessionClientToken

	return null
}

export async function removeClientToken(
	request: Request,
	returnUrl: string = '/'
) {
	const session = await getSession(request.headers.get('Cookie'))
	// session.set('doctortoken', '')
	session.set('clienttoken', '')
	session.set('username', '')
	throw redirect(returnUrl, {
		headers: {
			'Set-Cookie': await commitSession(session),
		},
	})
}
