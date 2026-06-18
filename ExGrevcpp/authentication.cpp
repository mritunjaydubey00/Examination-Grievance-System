#include <iostream>
#include "userFunction.h"
#include "localStorage.h"
using namespace std;

int Login()
{
    string clientName, passwordInput;
    cout << " Enter your username: ";
    getline(cin, clientName);
    cout << "Enter you password: ";
    getline(cin, passwordInput);
    // matchUser()
}
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