import { redirect, type ActionFunctionArgs } from "@remix-run/cloudflare";
import invariant from "tiny-invariant";
import getDoctorToken from "~/utils/getDoctorToken.server";
import { setUsername } from "~/utils/getUsername.server";

export const action = async ({
	params,
	request,
	context
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
			action: "deny"
		}),

	})
	let data: any = await response.json()
	console.log(data)
	return data
	// throw redirect(`/${roomId}/room`)
  };