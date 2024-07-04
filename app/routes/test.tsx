import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs, json } from '@remix-run/cloudflare'
import { Form, useFetcher, useLoaderData, useNavigation, useSubmit } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { Button } from '~/components/Button'
import { Input } from '~/components/Input'
import { ACCESS_AUTHENTICATED_USER_EMAIL_HEADER } from '~/utils/constants'
import getDoctorToken, { setDoctorToken } from '~/utils/getDoctorToken.server'
import { setUsername } from '~/utils/getUsername.server'
// import DataApi from '~/api/dataApi.server'

export default function Doctor() {
	const navigation = useNavigation();
	return (
		<div>
			<h1>Test</h1>
		</div>
	)
}
