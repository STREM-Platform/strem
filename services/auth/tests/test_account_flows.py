"""Account deletion (auth#7): needs the password, frees the email."""

import asyncio

import httpx

from tests.support import auth_client

CREDENTIALS = {"email": "sam@strem.app", "password": "Str0ng-Passphrase!"}


async def _register(client: httpx.AsyncClient) -> dict[str, str]:
    body = (await client.post("/v1/auth/register", json=CREDENTIALS)).json()
    return {"Authorization": f"Bearer {body['tokens']['access_token']}"}


def test_delete_account_needs_the_password_and_frees_the_email() -> None:
    async def scenario() -> None:
        async with auth_client() as client:
            headers = await _register(client)
            wrong = await client.request(
                "DELETE",
                "/v1/auth/account",
                headers=headers,
                json={"password": "nope-nope", "confirmation": "DELETE MY ACCOUNT"},
            )
            assert wrong.status_code == 401
            gone = await client.request(
                "DELETE",
                "/v1/auth/account",
                headers=headers,
                json={"password": CREDENTIALS["password"], "confirmation": "DELETE MY ACCOUNT"},
            )
            assert gone.status_code == 204
            login = await client.post("/v1/auth/login", json=CREDENTIALS)
            assert login.status_code == 401
            again = await client.post("/v1/auth/register", json=CREDENTIALS)
            assert again.status_code == 201

    asyncio.run(scenario())
