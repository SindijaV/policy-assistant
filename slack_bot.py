"""Run the policy bot locally with Slack Socket Mode."""
import os
import re
from pathlib import Path
from app import ask_openai, AppError


def load_tokens():
    values = {}
    path = Path(__file__).resolve().parent / '.env'
    if path.exists():
        for line in path.read_text(encoding='utf-8-sig').splitlines():
            if line.strip() and not line.lstrip().startswith('#') and '=' in line:
                name, value = line.split('=', 1)
                values[name.strip()] = value.strip().strip('\"\'')
    tokens = {name: os.environ.get(name, values.get(name, ''))
              for name in ('SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN')}
    for name, prefix in [('SLACK_BOT_TOKEN', 'xoxb-'), ('SLACK_APP_TOKEN', 'xapp-')]:
        if not tokens[name].startswith(prefix):
            raise ValueError('Save a valid ' + name + ' in .env, then restart.')
    return tokens


def answer_question(text):
    question = re.sub(r'<@[A-Z0-9]+>', '', text).strip()
    if not question:
        return 'Mention me with a policy question, for example: How many vacation days do employees receive?'
    if len(question) > 1000:
        return 'Please keep the question under 1,000 characters.'
    result = ask_openai(question, 'vector')
    parts = [result['answer']]
    if result.get('missing_information'):
        parts.append('Missing information: ' + result['missing_information'])
    if result['sources']:
        parts.append('Supporting policies:\n' + '\n\n'.join(
            p['title'] + '\n' + p['policy_text'] for p in result['sources']))
    else:
        parts.append('No supporting policy identified in the supplied database.')
    return '\n\n'.join(parts)


def main():
    try:
        from slack_bolt import App
        from slack_bolt.adapter.socket_mode import SocketModeHandler
    except ImportError:
        raise SystemExit('Install the bot package first: python3 -m pip install -r requirements.txt')
    try:
        tokens = load_tokens()
    except ValueError as error:
        raise SystemExit(str(error))
    bot = App(token=tokens['SLACK_BOT_TOKEN'])

    @bot.event('app_mention')
    def handle_mention(event, say):
        if event.get('bot_id') or event.get('subtype'):
            return
        try:
            reply = answer_question(event.get('text', ''))
        except AppError as error:
            reply = 'I could not complete the policy search. ' + str(error)
        except Exception:
            reply = 'The policy search is temporarily unavailable. Check the bot terminal and settings, then try again.'
        say(text=reply, mrkdwn=False, parse='none', unfurl_links=False, unfurl_media=False,
            thread_ts=event.get('thread_ts'))

    print('Starting Policy Assistant. Keep this terminal open; Control+C stops the bot.', flush=True)
    SocketModeHandler(bot, tokens['SLACK_APP_TOKEN']).start()


if __name__ == '__main__':
    main()
