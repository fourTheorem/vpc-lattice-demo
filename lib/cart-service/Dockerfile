FROM public.ecr.aws/docker/library/python:3.10-bookworm
WORKDIR /src
RUN curl -sSL https://install.python-poetry.org | python3 -
COPY ./pyproject.toml /src
COPY ./poetry.lock /src
RUN /root/.local/bin/poetry install
COPY ./*.py /src
CMD ["/root/.local/bin/poetry", "run", "uvicorn", "cart_item_api:app", "--host", "0.0.0.0", "--port", "80"]
