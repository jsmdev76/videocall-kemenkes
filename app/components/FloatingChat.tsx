import React, { useState } from 'react'
import { useRoomContext } from '~/hooks/useRoomContext'
import { Icon } from './Icon/Icon'

interface Message {
	text: string
	// sender: 'listener' | 'agent'
	sender: string
}

interface CustomerServiceChatProps {
	isOpen: boolean
	onClose: () => void
	onOpen: () => void
}

const FloatingChat: React.FC<CustomerServiceChatProps> = ({
	isOpen,
	onClose,
	onOpen,
}) => {
	const {
		room: { identity, sendChat, messages, roomState },
	} = useRoomContext()
	const [inputMessage, setInputMessage] = useState<string>('')

	const sendMessage = () => {
		sendChat({
			message: inputMessage,
		})
		if (inputMessage.trim()) {
			setInputMessage('')
		}
	}

	return (
		<>
			<div className="fixed bottom-6 right-6 z-50">
				<button
					className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
					onClick={onOpen}
				>
					<Icon type="ChatBubble" className="h-6 w-6 inline-block mr-2" />
					Chat
				</button>
			</div>

			{isOpen && (
				<div className="fixed bottom-24 right-6 w-96 h-[32rem] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 transition-all duration-300 ease-in-out">
					<div className="bg-blue-600 text-white p-4 flex justify-between items-center">
						<h3 className="font-bold text-lg">Super Chatttzzzz</h3>
						<button
							onClick={onClose}
							className="text-white hover:text-gray-200 focus:outline-none"
						>
							<Icon type="xCircle" className="h-6 w-6" />
						</button>
					</div>
					<div className="flex-grow overflow-y-auto p-4 space-y-4">
						{messages.map((msg, index) => {
							return (
								<div
									key={index}
									className={`flex flex-col space-y-1 ${
										msg.from === identity?.name ? 'items-end' : 'items-start'
									}`}
								>
									<div className="flex items-center space-x-2">
										<h1 className="text-xs font-semibold">{msg.from}</h1>
									</div>
									<div
										className={`max-w-[70%] p-3 rounded-lg ${
											msg.from === identity?.name
												? 'bg-blue-500 text-white'
												: 'bg-gray-200 text-black dark:bg-gray-700 dark:text-white'
										}`}
									>
										{msg.message}
									</div>
								</div>
							)
						})}
					</div>
					<div className="p-4 bg-gray-100 dark:bg-gray-900">
						<div className="flex items-center space-x-2">
							<input
								type="text"
								value={inputMessage}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setInputMessage(e.target.value)
								}
								onKeyDown={(e: React.KeyboardEvent) =>
									e.key === 'Enter' && sendMessage()
								}
								className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
								placeholder="Type a message..."
							/>
							<button
								onClick={sendMessage}
								className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
							>
								Send
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	)
}

export default FloatingChat
