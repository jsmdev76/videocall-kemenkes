import { redirect, type ActionFunctionArgs } from "@remix-run/cloudflare";
import invariant from "tiny-invariant";
import getDoctorToken, { removeDoctorToken } from "~/utils/getDoctorToken.server";
import { setUsername } from "~/utils/getUsername.server";

export const action = async ({
	params,
	request,
  }: ActionFunctionArgs) => {
	const host = 'http://localhost:3000';
	const url = new URL(request.url)
	let doctorToken = await getDoctorToken(request);
	console.log('doctorToken', doctorToken);
	if(!doctorToken) {
		throw redirect('/doctor');
	}
	const response = await fetch(`${host}/logout`, {
		method: 'post',
		headers: {
			'Authorization': 'Bearer '+doctorToken
		}
	})
	let data = await response.json();
	console.log('data', data)
	// return data;
	if(!data.success) {
		throw new Response(data.message, {status: 500});
	}
	// clear session
	return removeDoctorToken(request, `/doctor`);
  };