### Skill: Creating Unique XPath Locators from HTML Text

**Goal:** Derive a highly precise, **unique (1 of 1)** XPath locator for an element from an HTML snippet based on its visual description or textual attributes.

**Reference:** [Devhints XPath Cheatsheet](https://devhints.io/xpath)

#### Step-by-Step Methodology

1. **Identify the Target Element & Core Tag**
   Locate the specific HTML tag (`<div>`, `<button>`, `<a>`, `<input>`, etc.) representing the element. If the tag name might change, use the wildcard `*`.

2. **Leverage Unique Attributes (Direct Matching)**
   Look for stable, unique attributes like `id`, `name`, `data-testid`, or `aria-label`.
   * *Example (ID):* `//input[@id='submit-btn']`
   * *Example (Data Attributes):* `//*[@data-testid='login-email']`

3. **Use Text Content Matchers**
   When an element is defined by its visible text, map the description to standard text functions:
   * *Exact text match:* `//button[text()='Save Changes']`
   * *Partial text match:* `//a[contains(text(), 'Download')]`
   * *Ignoring whitespace:* `//span[normalize-space(text())='Submit']`

4. **Combine Conditions for Uniqueness (AND / OR)**
   If a single attribute or text match returns multiple elements, chain conditions together using `and` to narrow it down to exactly 1.
   * *Syntax:* `//tag[@attribute='value' and text()='Text']`
   * *Example:* `//button[@type='submit' and contains(text(), 'Login')]`

5. **Utilize Path Relations (Axes Navigation)**
   If the target element itself lacks unique attributes, find a unique parent, sibling, or container element nearby and traverse from it.
   * *Child to Parent:* `//input[@id='username']/parent::div`
   * *Ancestor to Descendant:* `//form[@id='search-form']//button` (Finds the button inside that specific form)
   * *Sibling Traversal:* `//label[text()='Email']/following-sibling::input` (Finds the input field next to the 'Email' label)

6. **Validate Uniqueness**
   Always verify in the browser DevTools console (using `$x("your_xpath")`) that the query returns an array length of exactly `1`.

***

#### Devhints XPath Quick Reference Cheatsheet

##### 1. Prefixes & Basic Steps
* `//` — Search anywhere in the document (e.g., `//hr[@class='edge']`)
* `./` — Relative path starting from the current node (e.g., `./a`)
* `/` — Root level path (e.g., `/html/body/div`)
* `//a/text()` — Extracts the text content of the node (`#=> "Go home"`)
* `//a/@href` — Extracts an attribute value (`#=> "index.html"`)
* `//a/*` — Matches all child elements under `<a>`

##### 2. Predicates & Logical Operators
* **Filters:** `//div[true()]` | `//div[@class="head"]` | `//div[@class="head"][@id="top"]` *(can be chained)*
* **Comparison:** `//a[@id = "xyz"]` | `//a[@id != "xyz"]` | `//a[@price > 25]`
* **Logic:** `//div[@id="head" and position()=2]` | `//div[(x and y) or not(z)]`
* **Node Checks:** `//ul[li]` *(Returns `<ul>` only if it has a `<li>` child)*

##### 3. Indexing & Chaining Order
* `//a[1]` — First `<a>` element
* `//a[last()]` — Last `<a>` element
* `//ol/li[2]` or `//ol/li[position()=2]` — Second `<li>` element
* *Note:* Order matters! `a[1][@href='/']` is **not** the same as `a[@href='/'][1]`

##### 4. Common Functions
* **Node Functions:** * `name()` — Tag name match (e.g., `//*[starts-with(name(), 'h')]`)
  * `text()` — Exact inner text match (e.g., `//button[text()="Submit"]`)
  * `count()` — Node counting (e.g., `//table[count(tr)=1]`)
* **String Functions:**
  * `contains(haystack, needle)` — `//font[contains(@class,"head")]`
  * `starts-with(str, prefix)` — `//font[starts-with(@class,"head")]`
  * `substring-before(str, char)` — `substring-before("01/02", "/")` (`#=> 01`)
  * `substring-after(str, char)` — `substring-after("01/02", "/")` (`#=> 02`)
  * `normalize-space()` — Strips leading/trailing spaces and normalizes internal spacing.

##### 5. XPath Axes (Relationships)
* `//ul/child::li` — Direct children (`ul > li`)
* `//ul/following-sibling::li` — Sibling elements at the same level (`ul ~ li`)
* `//ul/descendant-or-self::li` — Deep inner child elements (`ul li`)
* `//ul/ancestor-or-self::li` — Climbs tree to closest matching element (`$(ul).closest(li)`)
* `//ul/li/..` or `//ul/li/parent::*` — Moves up to the parent element

##### 6. Unions
* `//a | //div` — Merges the results of both queries into a single list.