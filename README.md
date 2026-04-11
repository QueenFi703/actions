# GitHub Actions for Gradle builds

A set of GitHub Actions that accelerate and simplify Gradle builds on GitHub — with smart caching, wrapper validation, job summaries, and optional supply-chain security via dependency graph submission.

> [!IMPORTANT]
> ## Licensing notice
>
> The software in this repository is licensed under the [MIT License](LICENSE).
>
> The caching functionality in this project has been extracted into `gradle-actions-caching`, a proprietary commercial component that is not covered by the MIT License for this repository.
> The bundled `gradle-actions-caching` component is licensed and governed by a separate license, available at https://gradle.com/legal/terms-of-use/.
>
> The `gradle-actions-caching` component is used only when caching is enabled and is not loaded or used when caching is disabled.
>
> Use of the `gradle-actions-caching` component is subject to a separate license, available at https://gradle.com/legal/terms-of-use/.
> If you do not agree to these license terms, do not use the `gradle-actions-caching` component.

This license notice will be displayed in workflow logs and each job summary. To suppress this message,
either [enable build scan publishing](docs/setup-gradle.md#publishing-to-scansgradlecom) (terms of use are pre-accepted by default) in your workflow, or [provide a Develocity access key](docs/setup-gradle.md#managing-develocity-access-keys).

## Recommended usage — root meta-action

The simplest way to get started is with the root meta-action (`QueenFi703/actions`). It sets up Java and Gradle in a single step with sensible defaults.

```yaml
name: Build

on:
  push:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout sources
      uses: actions/checkout@v4
    - name: Setup Java and Gradle
      uses: QueenFi703/actions@v1
    - name: Build with Gradle
      run: ./gradlew build
```

### Customising Java and Gradle

```yaml
    - name: Setup Java and Gradle
      uses: QueenFi703/actions@v1
      with:
        java-version: 21
        distribution: temurin
        gradle-version: '8.7'
        cache-read-only: false
```

### Enabling dependency graph submission

Set `enable-dependency-submission: true` to generate and submit a dependency graph for supply-chain security (requires `contents: write` permission):

```yaml
name: Dependency Submission

on:
  push:
    branches: [ 'main' ]

permissions:
  contents: write

jobs:
  dependency-submission:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout sources
      uses: actions/checkout@v4
    - name: Setup Java and Gradle, submit dependency graph
      uses: QueenFi703/actions@v1
      with:
        enable-dependency-submission: true
```

## Advanced usage — sub-actions

For fine-grained control, use the sub-actions directly:

- **`QueenFi703/actions/setup-gradle@v1`** — Configure Gradle caching, wrapper validation, build scans, and more.
- **`QueenFi703/actions/dependency-submission@v1`** — Generate and submit a dependency graph independently.

### Example: `setup-gradle` sub-action

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout sources
      uses: actions/checkout@v4
    - name: Setup Java
      uses: actions/setup-java@v4
      with:
        distribution: 'temurin'
        java-version: 17
    - name: Setup Gradle
      uses: QueenFi703/actions/setup-gradle@v1
    - name: Build with Gradle
      run: ./gradlew build
```

See the [full setup-gradle documentation](docs/setup-gradle.md) for all available inputs and advanced usage scenarios.

### Example: `dependency-submission` sub-action

```yaml
name: Dependency Submission

on:
  push:
    branches: [ 'main' ]

permissions:
  contents: write

jobs:
  dependency-submission:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout sources
      uses: actions/checkout@v4
    - name: Setup Java
      uses: actions/setup-java@v4
      with:
        distribution: 'temurin'
        java-version: 17
    - name: Generate and submit dependency graph
      uses: QueenFi703/actions/dependency-submission@v1
```

See the [full dependency-submission documentation](docs/dependency-submission.md) for more advanced usage scenarios.

## The `wrapper-validation` action

The `wrapper-validation` action validates the checksums of _all_ [Gradle Wrapper](https://docs.gradle.org/current/userguide/gradle_wrapper.html) JAR files present in the repository and fails if any unknown Gradle Wrapper JAR files are found.

The action should be run in the root of the repository, as it will recursively search for any files named `gradle-wrapper.jar`.

Starting with v4 the `setup-gradle` action will [perform wrapper validation](docs/setup-gradle.md#gradle-wrapper-validation) on each execution.
If you are using `setup-gradle` in your workflows, it is unlikely that you will need to use the `wrapper-validation` action.

### Example workflow

```yaml
name: "Validate Gradle Wrapper"

on:
  push:
  pull_request:

jobs:
  validation:
    name: "Validation"
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: QueenFi703/actions/wrapper-validation@v1
```

See the [full action documentation](docs/wrapper-validation.md) for more advanced usage scenarios.

## Credits

| Name | GitHub |
|---|---|
| Sophia Cole | [@QueenFi703](https://github.com/QueenFi703) |

See [CONTRIBUTORS.md](CONTRIBUTORS.md) for the full list.
