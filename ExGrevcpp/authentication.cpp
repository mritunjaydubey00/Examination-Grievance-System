#include <iostream>
#include "userFunction.h"
#include "localStorage.h"
using namespace std;

int SignUp()
{
    User *newUser = new User;
    makeUser(*newUser);
    return 0;
}

int main()
{
    SignUp();
    return 0;
}