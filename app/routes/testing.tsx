import type {
	ActionFunctionArgs,
	LoaderFunctionArgs,
} from '@remix-run/cloudflare'
import {
	Form,
	json,
	redirect,
	useActionData,
	useLoaderData,
	useNavigation,
	useSubmit,
} from '@remix-run/react'
import { useEffect, useState } from 'react'

type Email = {
	id: number
	email: string
}

type LoaderData = {
	emails: Email[]
	error?: string
}

type ActionData =
	| { success: true; message: string }
	| { success: false; error: string }

export async function loader({
	request,
}: LoaderFunctionArgs): Promise<Response> {
	try {
		const url = new URL(request.url)
		console.log('ini url gais : ', url.href)
		const emails: Email[] = [
			{
				email: 'rhesadav48@gmail.com',
				id: 1,
			},
			{
				email: 'mala.widiyanto@gmail.com',
				id: 2,
			},
			{
				email: 'rhesadav29@gmail.com',
				id: 3,
			},
		]
		return json<LoaderData>({ emails })
	} catch (error) {
		console.error('Error fetching emails:', error)
		return json<LoaderData>({ emails: [], error: 'Failed to fetch emails' })
	}
}

export async function action({
	request,
	context,
}: ActionFunctionArgs): Promise<Response> {
	const host = context.URL_API
	const url = new URL(request.url)
	const formData = await request.formData()
	const actionType = formData.get('actionType')

	try {
		if (actionType === 'sendEmail') {
			const to = formData.get('to') as string
			const subject = formData.get('subject') as string
			const title = formData.get('title') as string
			const content = formData.get('content') as string

			const response = await fetch(`${host}/call/sendemail`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': context.API_SECRET_KEY as string,
				},
				body: JSON.stringify({ to, subject, title, content }),
			})

			if (!response.ok) {
				throw new Error('Failed to send email')
			}

			return json<ActionData>({
				success: true,
				message: 'Email sent successfully',
			})
		} else if (actionType === 'submitForm') {
			const roomId = formData.get('roomId')
			const agentName = formData.get('agentName')
			const role = formData.get('role')

			if (!roomId || !agentName || !role) {
				return json<ActionData>({
					success: false,
					error: 'All fields are required',
				})
			}

			return redirect(
				`${url.origin}/${roomId}/room?username=${agentName}&role=${role}`
			)
		}

		return json<ActionData>({ success: false, error: 'Invalid action type' })
	} catch (error) {
		console.error('Action error:', error)
		return json<ActionData>({
			success: false,
			error: 'An unexpected error occurred',
		})
	}
}

export default function Projects() {
	const { emails, error: loaderError } = useLoaderData<LoaderData>()
	const actionData = useActionData<ActionData>()
	const navigation = useNavigation()
	const submit = useSubmit()
	const [sendingEmail, setSendingEmail] = useState<string | null>(null)
	const [formError, setFormError] = useState<string | null>(null)

	const handleSendEmail = (email: string) => {
		setSendingEmail(email)
		submit(
			{
				actionType: 'sendEmail',
				to: email,
				subject: 'Your Subject Here',
				title: 'Email Title',
				content: 'Your email content here',
			},
			{ method: 'post' }
		)
	}

	const busy = navigation.state === 'submitting'

	useEffect(() => {
		if (actionData && !actionData.success) {
			setFormError(actionData.error)
		} else {
			setFormError(null)
		}
	}, [actionData])

	return (
		<div className="max-w-4xl mx-auto p-8 bg-white shadow-xl rounded-xl">
			{loaderError && (
				<div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
					{loaderError}
				</div>
			)}

			{formError && (
				<div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
					{formError}
				</div>
			)}

			{actionData?.success && (
				<div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
					{actionData.message}
				</div>
			)}

			<Form method="post" className="mb-12 space-y-8">
				<input type="hidden" name="actionType" value="submitForm" />
				<div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
					<div>
						<label
							htmlFor="roomId"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Room ID
						</label>
						<input
							type="text"
							name="roomId"
							id="roomId"
							required
							className="w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900"
						/>
					</div>

					<div>
						<label
							htmlFor="agentName"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Agent Name
						</label>
						<input
							type="text"
							name="agentName"
							id="agentName"
							required
							className="w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900"
						/>
					</div>
				</div>

				<div>
					<label
						htmlFor="role"
						className="block text-sm font-medium text-gray-700 mb-2"
					>
						Role
					</label>
					<select
						name="role"
						id="role"
						required
						className="w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900"
					>
						<option value="agent">Agent</option>
						<option value="listener">Listener</option>
						<option value="whisper">Whisper</option>
					</select>
				</div>

				<div>
					<button
						type="submit"
						disabled={busy}
						className="w-full sm:w-auto px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out disabled:opacity-50"
					>
						{busy ? 'Submitting...' : 'Submit'}
					</button>
				</div>
			</Form>

			<div>
				<h2 className="text-2xl font-bold mb-8 text-gray-800">Email List</h2>
				{emails.length === 0 ? (
					<p className="text-gray-600">No emails available.</p>
				) : (
					<ul className="space-y-6">
						{emails.map((email) => (
							<li
								key={email.id}
								className="flex items-center justify-between bg-gray-50 p-6 rounded-lg shadow-sm"
							>
								<span className="text-gray-700 font-medium">{email.email}</span>
								<button
									onClick={() => handleSendEmail(email.email)}
									disabled={sendingEmail === email.email || busy}
									className="px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out disabled:opacity-50"
								>
									{sendingEmail === email.email ? 'Sending...' : 'Send Email'}
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	)
}
