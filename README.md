# SCAN Grafana
Кастомизация Grafana версии 8.5.15

Перед сборкой разархивируйте vendor.zip в папке public и удалите .zip
В случае, ошибки с .cue поменять на //go:embed cue.mod cue packages/grafana-schema/src/schema/*.cue packages/grafana-schema/src/scuemata/*/*.cue, чтобы не было ошибки.


## Tasks
Команды для запуска средствами Task, подробнее на сайте https://taskfile.dev

* build:                Сборка docker образа
* deploy-staging:       Деплой на staging
* git-fix:              Фиксация версии скриптов и документации в удаленном репозитории
* git-fix-tag:          Фиксация в git и создание тега
* push:                 Отправка docker образа в репозиторий

## Сборка образа

Перед сборкой надо скопировать 
- ./grafana/public/vendor
- cp dashboard.cue ~/projects/bonds/dev-tr/scan/packages/grafana-schema/src/scuemata/dashboard

TODO: сделать зип архивы и настроить проверки для сборки 
```shell
task build
```

## Добавление нового плагина в Grafana
В файл Dockerfile добавить строку которая перед `EXPOSE 3000` и запустить сборку образа
```dockerfile
RUN grafana-cli plugins install <plugin-name>
```

Если плагин не подписан на официальном репозитории Grafana, то добавить через запятую
название плагина в переменную `GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS` в файле
`deploy/scan/values.yaml`. Важно, не удалять из этой переменной плагины, которые уже были добавлены.

## Создание секрета для Grafana
В кубернетесе создать секрет с именем `scandb` и заполнить его данными для подключения к базе данных.
```shell
kubectl create secret generic scandb \
--from-literal=type='postgres' \
--from-literal=host='postgresql:5432' \
--from-literal=name='scan' \
--from-literal=user='trackrecords' \
--from-literal=password='trackrecords' \
--from-literal=mode='disable'
```



