# Example Posts Reference

This file consolidates the original sample posts from `src/content/posts/` into one AI-readable reference.
The live blog no longer needs to load these sample posts, but their original contents are preserved here.

## Source: `src/content/posts/advanced-typescript-conditional-types.md`

```md
---
title: 'Advanced TypeScript: Conditional Types'
published: 2025-07-10
draft: false
description: 'Dive into conditional types in TypeScript and how they can enhance type safety.'
tags: ['typescript', 'theory']
---

```shell
echo "Exploring advanced TypeScript features like conditional types"
```

Conditional types in TypeScript allow you to create types based on conditions. Here's an example:

```typescript
type IsString<T> = T extends string ? true : false

const test1: IsString<string> = true // Valid
const test2: IsString<number> = false // Valid
```

Conditional types are particularly useful for creating flexible and reusable type definitions.
```

## Source: `src/content/posts/concurrency-in-go.md`

```md
---
title: 'Concurrency in Go'
published: 2025-07-04
draft: false
description: 'Explore how Go handles concurrency with goroutines and channels.'
tags: ['go']
---

Go is known for its excellent support for concurrency. The primary tools for concurrency in Go are goroutines and channels. Here's an example:

```go
package main

import (
    "fmt"
    "time"
)

func say(s string) {
    for i := 0; i < 5; i++ {
        time.Sleep(100 * time.Millisecond)
        fmt.Println(s)
    }
}

func main() {
    go say("world")
    say("hello")
}
```

Channels are used to communicate between goroutines:

```go
package main

import "fmt"

func sum(s []int, c chan int) {
    sum := 0
    for _, v := range s {
        sum += v
    }
    c <- sum // send sum to channel
}

func main() {
    s := []int{7, 2, 8, -9, 4, 0}

    c := make(chan int)
    go sum(s[:len(s)/2], c)
    go sum(s[len(s)/2:], c)
    x, y := <-c, <-c // receive from channel

    fmt.Println(x, y, x+y)
}
```

Go's concurrency model is simple yet powerful, making it a great choice for concurrent programming.

```shell title="Running Go Concurrency Example"
go run concurrency_example.go
```
```

## Source: `src/content/posts/error-handling-in-go.md`

```md
---
title: 'Error Handling in Go'
published: 2025-07-08
draft: false
description: 'Understand how to handle errors effectively in Go.'
tags: ['go']
---

Go uses a simple and explicit approach to error handling. Here's an example:

```go title="error_handling.go"
package main

import (
    "errors"
    "fmt"
)

func divide(a, b int) (int, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}

func main() {
    result, err := divide(10, 0)
    if err != nil {
        fmt.Println("Error:", err)
    } else {
        fmt.Println("Result:", result)
    }
}
```

Error handling in Go is straightforward and encourages developers to handle errors explicitly.

```shell title="Running Go Error Handling Example"
go run error_handling.go
```
```

## Source: `src/content/posts/gos-interfaces-and-polymorphism.md`

```md
---
title: "Go's Interfaces and Polymorphism"
published: 2025-07-12
draft: false
description: 'Explore how Go uses interfaces to achieve polymorphism.'
tags: ['go']
---

Interfaces in Go provide a way to achieve polymorphism. Here's an example:

```go
package main

import "fmt"

type Shape interface {
    Area() float64
}

type Circle struct {
    Radius float64
}

func (c Circle) Area() float64 {
    return 3.14 * c.Radius * c.Radius
}

type Rectangle struct {
    Width, Height float64
}

func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}

func printArea(s Shape) {
    fmt.Println("Area:", s.Area())
}

func main() {
    c := Circle{Radius: 5}
    r := Rectangle{Width: 4, Height: 6}

    printArea(c)
    printArea(r)
}
```

Interfaces in Go are a powerful way to write flexible and reusable code.

```shell title="Running Go Interfaces Example"
go run interfaces_example.go
```
```

## Source: `src/content/posts/javascript-prototypal-inheritance.md`

```md
---
title: "JavaScript's Prototypal Inheritance"
published: 2025-07-13
draft: false
description: 'Learn how prototypal inheritance works in JavaScript and its use cases.'
tags: ['javascript']
---

Prototypal inheritance is a feature in JavaScript that allows objects to inherit properties and methods from other objects. Here's an example:

```javascript
const parent = {
  greet() {
    console.log('Hello from parent!')
  },
}

const child = Object.create(parent)
child.greet() // Hello from parent!
```

Prototypal inheritance is a flexible way to share behavior between objects without using classes.

```shell title="Testing Prototypal Inheritance"
node -e "const parent = { greet() { console.log('Hello from parent!'); } }; const child = Object.create(parent); child.greet();"
```
```

## Source: `src/content/posts/javascripts-event-loop-explained.md`

```md
---
title: "JavaScript's Event Loop Explained"
published: 2025-07-09
draft: false
description: 'Understand how the JavaScript event loop works and its role in asynchronous programming.'
tags: ['javascript']
---

The event loop is a critical part of JavaScript's runtime, enabling asynchronous programming. Here's a simple example:

```javascript
console.log('Start')

setTimeout(() => {
  console.log('Timeout')
}, 0)

console.log('End')
```

Output:

```
Start
End
Timeout
```

The event loop ensures that the call stack is empty before executing tasks from the callback queue. This mechanism allows JavaScript to handle asynchronous operations efficiently.

```shell title="Understanding the Event Loop"
node -e "console.log('Start'); setTimeout(() => { console.log('Timeout'); }, 0); console.log('End');"
```
```

## Source: `src/content/posts/mastering-async-await-in-javascript.md`

```md
---
title: 'Mastering Async/Await in JavaScript'
published: 2025-07-05
draft: false
description: 'Learn how to handle asynchronous operations in JavaScript using async/await.'
tags: ['javascript']
---

Async/await simplifies working with asynchronous code in JavaScript. Here's an example:

```javascript
async function fetchData() {
  try {
    const response = await fetch('https://api.example.com/data')
    const data = await response.json()
    console.log(data)
  } catch (error) {
    console.error('Error fetching data:', error)
  }
}

fetchData()
```

Async/await is built on top of Promises and makes the code more readable and maintainable.

```shell title="Running Async/Await Example"
node -e "(async () => { const response = await fetch('https://api.example.com/data'); console.log(await response.json()); })()"
```
```

## Source: `src/content/posts/python-decorators-demystified.md`

```md
---
title: 'Python Decorators Demystified'
published: 2025-07-03
draft: false
description: 'An introduction to Python decorators and how to use them effectively.'
series: 'Python Basics'
tags: ['python']
---

Decorators in Python are a powerful way to modify the behavior of functions or methods. Here's a simple example:

```python
def decorator_function(original_function):
    def wrapper_function(*args, **kwargs):
        print(f"Wrapper executed before {original_function.__name__}")
        return original_function(*args, **kwargs)
    return wrapper_function

@decorator_function
def say_hello():
    print("Hello!")

say_hello()
```

Decorators can also be used with arguments:

```python
def repeat(times):
    def decorator(func):
        def wrapper(*args, **kwargs):
            for _ in range(times):
                func(*args, **kwargs)
        return wrapper
    return decorator

@repeat(3)
def greet():
    print("Hi!")

greet()
```

Decorators are widely used in Python for logging, access control, and more.

```shell title="Running Python Decorators"
python -c "@decorator_function\ndef say_hello():\n    print(\"Hello!\")\nsay_hello()"
```
```

## Source: `src/content/posts/pythons-context-managers-and-the-with-statement.md`

```md
---
title: "Python's Context Managers and the with Statement"
published: 2025-07-15
draft: false
description: 'Learn how to use context managers and the with statement in Python for resource management.'
series: 'Python Basics'
tags: ['python']
---

Context managers in Python are used to manage resources efficiently. Here's an example:

```python
with open('example.txt', 'w') as file:
    file.write('Hello, world!')
```

You can also create custom context managers using classes or the `contextlib` module:

```python
from contextlib import contextmanager

@contextmanager
def custom_context():
    print('Entering context')
    yield
    print('Exiting context')

with custom_context():
    print('Inside context')
```

Context managers ensure that resources are properly cleaned up, making your code more reliable and maintainable.

```shell title="Using Python Context Managers"
python -c "with open('example.txt', 'w') as file: file.write('Hello, world!')"
```
```

## Source: `src/content/posts/pythons-generators-and-yield.md`

```md
---
title: "Python's Generators and Yield"
published: 2025-07-11
draft: false
description: 'Learn how to use generators and the yield keyword in Python for efficient iteration.'
series: 'Python Basics'
tags: ['python']
---

Generators in Python are a way to create iterators using the `yield` keyword. Here's an example:

```python
def count_up_to(n):
    count = 1
    while count <= n:
        yield count
        count += 1

for number in count_up_to(5):
    print(number)
```

Generators are memory-efficient and allow you to work with large datasets without loading them entirely into memory.

```shell title="Running Python Generators"
python -c "def count_up_to(n):\n    count = 1\n    while count <= n:\n        yield count\n        count += 1\nfor number in count_up_to(5):\n    print(number)"
```
```

## Source: `src/content/posts/pythons-list-comprehensions.md`

```md
---
title: "Python's List Comprehensions"
published: 2025-07-07
draft: false
description: 'Learn how to use list comprehensions in Python for concise and readable code.'
series: 'Python Basics'
tags: ['python']
---

List comprehensions provide a concise way to create lists in Python. Here's an example:

```python
# Create a list of squares
squares = [x**2 for x in range(10)]
print(squares)

# Filter even numbers
evens = [x for x in range(10) if x % 2 == 0]
print(evens)

# Nested comprehensions
matrix = [[i * j for j in range(5)] for i in range(5)]
print(matrix)
```

List comprehensions are a powerful feature for creating and transforming lists in Python.

```shell title="Running Python List Comprehensions"
python -c "print([x**2 for x in range(10)])"
```
```

## Source: `src/content/posts/showing-off-blog-features/index.md`

Note: this sample post referenced local assets from `src/content/posts/showing-off-blog-features/`.
Those assets remain in the repository, but the post itself has been removed from the live content collection.

```md
---
title: 'Showing Off Blog Features'
published: 2025-07-20
draft: false
tags: ['astro', 'demo', 'markdown']
toc: true
coverImage:
  src: './cover.jpg'
  alt: 'A person with short, thick hair and prescription glasses sits at an organized workstation, using a magnification app to navigate a webpage. Their posture is proper and relaxed. On the desk: a computer, a mouse, a large desk lamp and a small notebook.'
---

Since the post does not have a description in the frontmatter, the first paragraph is used.

## Theming

> Use your favorite editor theme for your blog!

Theming for the website comes from builtin Shiki themes found in Expressive Code.

## Code Blocks

```python
def hello_world():
    print("Hello, world!")

hello_world()
```

```python title="hello.py"
def hello_world():
    print("Hello, world!")

hello_world()
```

```shell
python hello.py
```

Also some inline code: `1 + 2 = 3`.

## Basic Markdown Elements

- List item 1
- List item 2

**Bold text**

_Italic text_

~~Strikethrough text~~

[Link](https://www.example.com)

## Images

![Pixel art of a tree](./PixelatedGreenTreeSide.png 'Pixel art renders poorly without proper CSS')

## Admonitions

:::note
testing123
:::

:::tip
testing123
:::

:::important
testing123
:::

:::caution
testing123
:::

:::warning
testing123
:::

## Character Chats

:::duck
**Did you know?** You can easily create custom character chats for your blog with MultiTerm!
:::

## GitHub Cards

::github{repo="stelcodes/multiterm-astro"}

::github{user="withastro"}

## Emoji

Good morning! :sleeping: :coffee: :pancakes:

## LaTeX/KaTeX Math Support

Make those equations pretty! $ \frac{a}{b} \cdot b = a $

$$
a + ar + ar^2 + ar^3 + \dots + ar^{n-1} = \displaystyle\sum_{k=0}^{n - 1}ar^k = a \bigg(\dfrac{1 - r^n}{1 -r}\bigg)
$$

## HTML Elements

<button>A Button</button>
```

## Source: `src/content/posts/typescript-generics-explained.md`

```md
---
title: 'TypeScript Generics Explained'
published: 2025-07-02
draft: false
description: 'Learn how to use generics in TypeScript to create reusable and type-safe code.'
tags: ['typescript']
---

Generics in TypeScript allow you to create reusable and type-safe components. Here's a simple example:

```typescript
function identity<T>(arg: T): T {
  return arg
}

console.log(identity<string>('Hello'))
console.log(identity<number>(42))
```

Generics can also be used with classes and interfaces:

```typescript
class Box<T> {
  private content: T

  constructor(content: T) {
    this.content = content
  }

  getContent(): T {
    return this.content
  }
}

const stringBox = new Box<string>('TypeScript')
console.log(stringBox.getContent())
```

Generics are a powerful feature that can make your TypeScript code more flexible and maintainable.
```

## Source: `src/content/posts/typescripts-keyof-and-mapped-types.md`

```md
---
title: "TypeScript's keyof and Mapped Types"
published: 2025-07-14
draft: false
description: 'Explore the keyof operator and mapped types in TypeScript for advanced type manipulation.'
tags: ['typescript']
---

The `keyof` operator and mapped types in TypeScript allow for advanced type manipulation. Here's an example:

```typescript
interface User {
  id: number
  name: string
  email: string
}

type UserKeys = keyof User // 'id' | 'name' | 'email'

type ReadonlyUser = {
  [K in keyof User]: Readonly<User[K]>
}

const user: ReadonlyUser = {
  id: 1,
  name: 'John',
  email: 'john@example.com',
}
```

These features make TypeScript a powerful tool for creating robust and type-safe applications.

```shell title="Exploring keyof and Mapped Types"
echo "Using keyof and mapped types in TypeScript"
```
```

## Source: `src/content/posts/typescript-utility-types.md`

```md
---
title: 'TypeScript Utility Types'
published: 2025-07-06
draft: false
description: 'Explore the built-in utility types in TypeScript and how to use them.'
tags: ['typescript']
---

TypeScript provides several utility types to make your code more concise and type-safe. For example:

```typescript
interface User {
  id: number
  name: string
  email: string
}

const updateUser: Partial<User> = { name: 'New Name' }
const readonlyUser: Readonly<User> = { id: 1, name: 'John', email: 'john@example.com' }
const userName: Pick<User, 'name'> = { name: 'John' }
const userWithoutEmail: Omit<User, 'email'> = { id: 1, name: 'John' }
```

Utility types are a great way to work with complex types in TypeScript.

```shell title="Exploring TypeScript Utility Types"
echo "Using Partial, Readonly, Pick, and Omit in TypeScript"
```
```

## Source: `src/content/posts/understanding-closures-in-javascript.md`

```md
---
title: 'Understanding Closures in JavaScript'
published: 2025-07-01
draft: false
description: 'A deep dive into closures and their applications in JavaScript.'
tags: ['javascript']
---

![javascript code](https://upload.wikimedia.org/wikipedia/commons/e/ef/Programming_code.jpg)

Closures are a fundamental concept in JavaScript that allow functions to access variables from their outer scope. Here's an example:

```javascript
function outerFunction(outerVariable) {
  return function innerFunction(innerVariable) {
    console.log(`Outer Variable: ${outerVariable}`)
    console.log(`Inner Variable: ${innerVariable}`)
  }
}

const newFunction = outerFunction('outside')
newFunction('inside')
```

Closures are particularly useful for creating private variables and functions.

```javascript
function Counter() {
  let count = 0
  return {
    increment: () => count++,
    getCount: () => count,
  }
}

const counter = Counter()
counter.increment()
console.log(counter.getCount()) // 1
```

Closures are a powerful tool in JavaScript, enabling encapsulation and modularity.
```
