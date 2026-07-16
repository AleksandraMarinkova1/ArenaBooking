# 1. Изградба на апликацијата (Build Stage)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Копирање на .csproj и реставрација на пакетите
COPY *.csproj ./
RUN dotnet restore

# Копирање на целиот код и објавување (Publish)
COPY . ./
RUN dotnet publish -c Release -o /app/publish

# 2. Стартување во продукција (Runtime Stage)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Поставување на портата на која ќе слуша Render
ENV ASPNETCORE_URLS=http://+:80
EXPOSE 80

ENTRYPOINT ["dotnet", "Backend.dll"]