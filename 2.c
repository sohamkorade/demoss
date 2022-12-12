#include <stdio.h>

int main() {
  long long int i, N;
  scanf("%lld", &N);
  long long int a[N], b;
  long long int dotprod = 0;
  for (i = 0; i < N; i++)
    scanf("%lld", &a[i]);
  for (i = 0; i < N; i++)
    scanf("%lld", &b), dotprod += a[i] * b;

  printf("%lld\n", dotprod);
}