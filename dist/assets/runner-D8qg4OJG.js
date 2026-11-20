import{aZ as L,a_ as a,a$ as S}from"./vendor-DtPqca5b.js";import{f as k}from"./progress-QiRlvUFk.js";import{c as s,d as F}from"./native-confirm-BAOZ3qZ8.js";const M=[{key:"hello",byLang:{python:{code:`print("你好喵～我是咪爱编程！")
`,expectStdout:`你好喵～我是咪爱编程！
`},c:{code:["#include <stdio.h>","","int main() {",'    printf("你好喵～我是咪爱编程！\\n");',"    return 0;","}",""].join(`
`),expectStdout:`你好喵～我是咪爱编程！
`},cpp:{code:["#include <iostream>","using namespace std;","","int main() {",'    cout << "你好喵～我是咪爱编程！" << endl;',"    return 0;","}",""].join(`
`),expectStdout:`你好喵～我是咪爱编程！
`},java:{code:["public class Main {","    public static void main(String[] args) {",'        System.out.println("你好喵～我是咪爱编程！");',"    }","}",""].join(`
`),expectStdout:`你好喵～我是咪爱编程！
`}}},{key:"math",byLang:{python:{code:["a = 3","b = 5",'print("3 + 5 等于", a + b)','print("3 × 5 等于", a * b)',""].join(`
`),expectStdout:`3 + 5 等于 8
3 × 5 等于 15
`},c:{code:["#include <stdio.h>","","int main() {","    int a = 3, b = 5;",'    printf("3 + 5 等于 %d\\n", a + b);','    printf("3 × 5 等于 %d\\n", a * b);',"    return 0;","}",""].join(`
`),expectStdout:`3 + 5 等于 8
3 × 5 等于 15
`},cpp:{code:["#include <iostream>","using namespace std;","","int main() {","    int a = 3, b = 5;",'    cout << "3 + 5 等于 " << a + b << endl;','    cout << "3 × 5 等于 " << a * b << endl;',"    return 0;","}",""].join(`
`),expectStdout:`3 + 5 等于 8
3 × 5 等于 15
`},java:{code:["public class Main {","    public static void main(String[] args) {","        int a = 3, b = 5;",'        System.out.println("3 + 5 等于 " + (a + b));','        System.out.println("3 × 5 等于 " + (a * b));',"    }","}",""].join(`
`),expectStdout:`3 + 5 等于 8
3 × 5 等于 15
`}}},{key:"input",byLang:{python:{code:['n = int(input("请输入一个数字："))','print("它的两倍是", n * 2)',""].join(`
`),stdin:`21
`,expectStdout:`请输入一个数字：它的两倍是 42
`},c:{code:["#include <stdio.h>","","int main() {","    int n;",'    printf("请输入一个数字：");','    scanf("%d", &n);','    printf("它的两倍是 %d\\n", n * 2);',"    return 0;","}",""].join(`
`),stdin:`21
`,expectStdout:`请输入一个数字：它的两倍是 42
`},cpp:{code:["#include <iostream>","using namespace std;","","int main() {","    int n;",'    cout << "请输入一个数字：";',"    cin >> n;",'    cout << "它的两倍是 " << n * 2 << endl;',"    return 0;","}",""].join(`
`),stdin:`21
`,expectStdout:`请输入一个数字：它的两倍是 42
`},java:{code:["import java.util.Scanner;","","public class Main {","    public static void main(String[] args) {","        Scanner sc = new Scanner(System.in);",'        System.out.print("请输入一个数字：");',"        int n = sc.nextInt();",'        System.out.println("它的两倍是 " + (n * 2));',"    }","}",""].join(`
`),stdin:`21
`,expectStdout:`请输入一个数字：它的两倍是 42
`}}}];function y(n,e){return M.find(u=>u.byLang[n].code===e)}function N(n,e,u){if(n===e)return null;const i=y(n,u);if(!i)return null;const o=i.byLang[e];return{code:o.code,stdin:o.stdin??""}}const I=L("runner",()=>{const n=a("python"),e=a({c:"",cpp:"",java:"",python:""}),u=S({get:()=>e.value[n.value],set:t=>{e.value[n.value]=t}}),i=a(""),o=a(!1),d=a(!1),c=a(null),v=a(0),r=a({c:null,cpp:null,java:null,python:null}),p=a(null),f=a(!1),g=S(()=>s(e.value[n.value])!==r.value[n.value]);function b(t,l){n.value=t,e.value[t]=l,r.value[t]=s(l),i.value="",c.value=null}function j(t){if(t===n.value)return;const l=N(n.value,t,u.value);n.value=t;const m=e.value[t],R=m.trim()===""||y(t,m)!==void 0;l&&R?(e.value[t]=l.code,r.value[t]=s(l.code),i.value=l.stdin):i.value="",c.value=null}function h(){c.value=null}async function w(){d.value=!0;try{return await F()}finally{d.value=!1}}async function x(){if(o.value||!u.value.trim()||d.value)return;const t=await w();if(t!==null){v.value++,o.value=!0,c.value=null;try{p.value=s(u.value),f.value=p.value!==r.value[n.value],c.value=await window.miai.runCode({lang:n.value,code:u.value,stdin:i.value.length>0?i.value:void 0,...t?{native:!0}:{}})}catch(l){console.error("[runner] run request failed:",l),c.value=k()}finally{o.value=!1}}}return{lang:n,code:u,codes:e,stdin:i,running:o,lastResult:c,runSeq:v,lastRunFp:p,lastRunOwn:f,currentOwn:g,setCode:b,setLang:j,clearResult:h,run:x}});export{M as S,I as u};
