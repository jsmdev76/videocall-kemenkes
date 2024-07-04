import { json, redirect, type ActionFunctionArgs } from "@remix-run/cloudflare";
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
	const username = url.searchParams.get('username')
	const id = url.searchParams.get('id')

	console.log(url)

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
	// return data
	// return json({data})
	throw redirect(`/doctor/dashboard?username=${username}&id=${id}`)
  };