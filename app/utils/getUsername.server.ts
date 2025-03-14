import { redirect } from '@remix-run/cloudflare'
import { commitSession, getSession } from '~/session'
import { ACCESS_AUTHENTICATED_USER_EMAIL_HEADER } from './constants'

export async function setUsername(
	username: string,
	trxClientToken: string,
	request: Request,
	returnUrl: string = '/'
) {
	console.log("ini request =>",request)
	console.log("ini returnUrl =>",returnUrl)
	console.log("ini trxClientToken =>",trxClientToken)
	console.log("ini username =>",username)
	
	const session = await getSession(request.headers.get('Cookie'))
	session.set('username', username)
	session.set('clienttoken', trxClientToken)
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
export default async function getUsername(request: Request) {
	const accessUsername = request.headers.get(
		ACCESS_AUTHENTICATED_USER_EMAIL_HEADER
	)
	const url = request.url
	console.log(request.url)
	// const url = new URLSearchParams()
	// console.log(url)
	// const listener = url.get("listener")
	// console.log("ini listener =>",listener)
	if (accessUsername) return accessUsername

	const session = await getSession(request.headers.get('Cookie'))
	const sessionUsername = session.get('username')
	if (typeof sessionUsername === 'string') return sessionUsername

	return 'anonymous_$43567243567u'
	// return null
}
